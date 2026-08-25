import { afterEach, describe, expect, it } from "vitest";

import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import { createTherapyStudioDatabase } from "../../lib/data/database";
import { restorePromptLibraryRecovery } from "./restorePromptLibraryRecovery";

const databases = [];

function backup() {
  return {
    format: "therapy-studio-prompt-library-recovery",
    version: 2,
    categories: [{ id: "category-1", name: "Connection" }],
    decks: [
      {
        archived: false,
        resource: {
          id: "deck-1",
          type: "prompt-deck",
          title: "Check in",
          categoryId: "category-1",
          prompts: [{ id: "prompt-1", text: "How are you?" }],
        },
      },
    ],
    playlistReferences: [],
  };
}

function database() {
  const value = createTherapyStudioDatabase({
    name: `prompt-recovery-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  });
  databases.push(value);
  return value;
}

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (value) => {
      value.close();
      await value.delete();
    })
  );
});

describe("Prompt Library recovery restore", () => {
  it("restores a stored-records export including its playlists", async () => {
    const target = database();
    await target.open();
    const storedBackup = {
      format: "therapy-studio-prompt-library-stored-records",
      version: 1,
      records: {
        categories: backup().categories,
        playlists: [{ id: "playlist-1", title: "Plan", items: [] }],
        promptDecks: [{ ...backup().decks[0].resource, archived: false }],
      },
      summary: { missingVisibleDeckIds: [], serializationFailures: [] },
    };

    await restorePromptLibraryRecovery({ backup: storedBackup, database: target });

    expect(await target.table("resources").count()).toBe(1);
    expect(await target.table("playlists").toArray()).toEqual(storedBackup.records.playlists);
  });

  it("restores a validated recovery snapshot exactly into an empty local library", async () => {
    const target = database();
    await target.open();

    await expect(restorePromptLibraryRecovery({ backup: backup(), database: target })).resolves.toEqual(
      expect.objectContaining({ categories: 1, decks: 1, prompts: 1 })
    );
    expect(await target.table("categories").toArray()).toEqual(backup().categories);
    expect(await target.table("resources").toArray()).toEqual([
      { ...backup().decks[0].resource, archived: false },
    ]);
  });

  it("refuses an ID collision without changing any records", async () => {
    const target = database();
    await target.open();
    await target.table("resources").add({ id: "deck-1", type: "worksheet" });

    await expect(restorePromptLibraryRecovery({ backup: backup(), database: target })).rejects.toThrow(
      /existing IDs would be overwritten/i
    );
    expect(await target.table("categories").count()).toBe(0);
    expect(await target.table("resources").count()).toBe(1);
  });

  it("allows noncolliding local records to remain untouched", async () => {
    const target = database();
    await target.open();
    await target.table("resources").add({ id: "worksheet-1", type: "worksheet" });

    await restorePromptLibraryRecovery({ backup: backup(), database: target });

    expect(await target.table("resources").toArray()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "worksheet-1" }),
        expect.objectContaining({ id: "deck-1" }),
      ])
    );
  });

  it("refuses a nested prompt ID collision without partial writes", async () => {
    const target = database();
    await target.open();
    await target.table("resources").add({
      id: "existing-deck",
      type: "prompt-deck",
      prompts: [{ id: "prompt-1", text: "Existing" }],
    });

    await expect(
      restorePromptLibraryRecovery({ backup: backup(), database: target })
    ).rejects.toThrow(/prompt prompt-1/i);
    expect(await target.table("categories").count()).toBe(0);
    expect(await target.table("resources").count()).toBe(1);
  });
});
