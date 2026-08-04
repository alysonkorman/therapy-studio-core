import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import { createTherapyStudioDatabase } from "./database";
import { createResourceRepository } from "./resourceRepository";
import { createPlaylistRepository } from "./playlistRepository";

const databases = [];
const timestamp = "2026-08-03T12:00:00.000Z";

function deck() {
  return {
    id: "deck-1",
    type: "prompt-deck",
    title: "Deck",
    description: "",
    category: "",
    categoryId: null,
    color: "#6C46C3",
    iconId: "prompt-default",
    sortOrder: 0,
    diagnoses: [],
    goals: [],
    ageRanges: [],
    tags: [],
    prompts: [{ id: "prompt-1", text: "Question?", sortOrder: 0 }],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function setup() {
  const database = createTherapyStudioDatabase({
    name: `playlist-repository-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  });
  databases.push(database);
  let id = 0;
  return {
    database,
    resources: createResourceRepository({ database, now: () => timestamp }),
    repository: createPlaylistRepository({
      database,
      now: () => timestamp,
      createId: () => `generated-${++id}`,
    }),
  };
}

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    })
  );
});

describe("playlistRepository", () => {
  let context;
  beforeEach(async () => {
    context = setup();
    await context.resources.createResourceRecord(deck());
  });

  it("creates, edits, duplicates, archives, and restores playlists", async () => {
    const created = await context.repository.createPlaylist({ title: "Warmups" });
    expect(
      (await context.repository.updatePlaylist(created.id, { title: "Openers" })).title
    ).toBe("Openers");
    const duplicate = await context.repository.duplicatePlaylist(created.id);
    expect(duplicate.title).toBe("Openers Copy");
    expect((await context.repository.archivePlaylist(created.id)).archived).toBe(true);
    expect((await context.repository.restorePlaylist(created.id)).archived).toBe(false);
  });

  it("adds deck and prompt references, reorders, and removes them", async () => {
    const playlist = await context.repository.createPlaylist({ title: "Session" });
    await context.repository.addPlaylistItem(playlist.id, {
      type: "prompt-deck",
      deckId: "deck-1",
    });
    const updated = await context.repository.addPlaylistItem(playlist.id, {
      type: "prompt-item",
      deckId: "deck-1",
      promptId: "prompt-1",
    });
    const reversed = await context.repository.reorderPlaylistItems(
      playlist.id,
      updated.items.map(({ id }) => id).reverse()
    );
    expect(reversed.items.map(({ type }) => type)).toEqual([
      "prompt-item",
      "prompt-deck",
    ]);
    const removed = await context.repository.removePlaylistItem(
      playlist.id,
      reversed.items[0].id
    );
    expect(removed.items).toHaveLength(1);
  });

  it("rejects broken references without a partial write", async () => {
    const playlist = await context.repository.createPlaylist({ title: "Session" });
    await expect(
      context.repository.addPlaylistItem(playlist.id, {
        type: "prompt-item",
        deckId: "deck-1",
        promptId: "missing",
      })
    ).rejects.toMatchObject({ code: "invalid-authoring-reference" });
    expect((await context.repository.getPlaylistById(playlist.id)).items).toEqual([]);
  });
});
