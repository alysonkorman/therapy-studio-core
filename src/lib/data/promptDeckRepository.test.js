import { afterEach, describe, expect, it, vi } from "vitest";

import { promptDecks } from "../../data/resources/promptDecks";
import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import { createTherapyStudioDatabase } from "./database";
import { createPromptDeckRepository } from "./promptDeckRepository";
import { createPlaylistRepository } from "./playlistRepository";
import { createResourceMemoryRepository } from "./resourceMemoryRepository";

const databases = [];
const times = ["2026-08-03T12:00:00.000Z", "2026-08-03T12:01:00.000Z"];

function setup() {
  const database = createTherapyStudioDatabase({
    name: `prompt-deck-repository-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  });
  databases.push(database);
  let id = 0;
  let time = 0;
  return {
    database,
    repository: createPromptDeckRepository({
      database,
      createId: () => `new-${++id}`,
      now: () => times[Math.min(time++, times.length - 1)],
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

describe("promptDeckRepository", () => {
  it("explicitly seeds imported decks idempotently and reports edited conflicts", async () => {
    const { repository } = setup();
    const imported = promptDecks.slice(0, 2);
    expect(await repository.seedImportedPromptDecks(imported)).toMatchObject({
      created: 2,
      unchanged: 0,
    });
    expect(await repository.seedImportedPromptDecks(imported)).toMatchObject({
      created: 0,
      unchanged: 2,
    });
    await repository.updatePromptDeck(imported[0].id, { title: "My edited deck" });
    const result = await repository.seedImportedPromptDecks(imported);
    expect(result.conflicts).toEqual([imported[0].id]);
    expect((await repository.getPromptDeckById(imported[0].id)).legacyMetadata).toEqual(
      imported[0].legacyMetadata
    );
  });

  it("creates, updates, duplicates, archives, restores, and reorders decks", async () => {
    const { repository } = setup();
    const first = await repository.createPromptDeck({ title: "First" });
    const second = await repository.createPromptDeck({ title: "Second" });
    const updated = await repository.updatePromptDeck(first.id, {
      category: "Connection",
      color: "#112233",
      diagnoses: ["Anxiety", "Anxiety", ""],
    });
    expect(updated).toMatchObject({
      category: "Connection",
      color: "#112233",
      diagnoses: ["Anxiety"],
    });
    expect(updated.createdAt).toBe(first.createdAt);
    expect(updated.updatedAt).not.toBe(first.updatedAt);
    expect((await repository.duplicatePromptDeck(first.id)).id).not.toBe(first.id);
    expect((await repository.archivePromptDeck(first.id)).archived).toBe(true);
    expect((await repository.restorePromptDeck(first.id)).archived).toBe(false);
    const all = await repository.getAllPromptDecks({ includeArchived: true });
    const reordered = await repository.reorderPromptDecks(
      all.map(({ id }) => id).reverse()
    );
    expect(reordered[0].id).not.toBe(second.id);
  });

  it("permanently deletes a deck, its local memory, and playlist references", async () => {
    const { database, repository } = setup();
    const playlists = createPlaylistRepository({ database, now: () => times[0] });
    const memory = createResourceMemoryRepository({ database, now: () => times[0] });
    const deck = await repository.createPromptDeck({ title: "Delete me" });
    const playlist = await playlists.createPlaylist({ title: "My playlist" });
    await playlists.addPlaylistItem(playlist.id, {
      deckId: deck.id,
      type: "prompt-deck",
    });
    await memory.upsertResourceMemory(deck.id, { favorite: true });

    await expect(repository.deletePromptDeck(deck.id)).resolves.toEqual({ id: deck.id });
    await expect(repository.getPromptDeckById(deck.id)).rejects.toMatchObject({
      code: "resource-not-found",
    });
    expect(await database.table("resourceMemory").get(deck.id)).toBeUndefined();
    expect((await playlists.getPlaylistById(playlist.id)).items).toEqual([]);
  });

  it("hides a built-in deck instead of destroying its seeded record", async () => {
    const { database, repository } = setup();
    const starter = promptDecks[0];
    await repository.seedImportedPromptDecks([starter]);

    await expect(repository.deletePromptDeck(starter.id)).resolves.toEqual({
      id: starter.id,
      hidden: true,
    });
    expect(await database.table("resources").get(starter.id)).toMatchObject({
      id: starter.id,
      archived: true,
      updatedAt: times[0],
    });
    expect(await repository.getAllPromptDecks()).toEqual([]);
    expect(await repository.getAllPromptDecks({ includeArchived: true })).toHaveLength(1);
  });

  it("archives built-ins and tombstones account-owned decks in one mixed operation", async () => {
    const database = createTherapyStudioDatabase({
      name: `prompt-deck-delete-mixed-${crypto.randomUUID()}`,
      indexedDB,
      IDBKeyRange,
    });
    databases.push(database);
    const accountData = {
      saveTracked: vi.fn(async () => ({ tracked: true })),
      tombstoneTracked: vi.fn(async () => ({ tracked: true })),
      trackCreated: vi.fn(async () => ({ tracked: true })),
    };
    const repository = createPromptDeckRepository({
      accountData,
      createId: () => "account-deck",
      database,
      now: () => times[0],
    });
    const starter = promptDecks[0];
    await repository.seedImportedPromptDecks([starter]);
    const accountDeck = await repository.createPromptDeck({ title: "Account-owned" });

    await repository.deletePromptDecks([starter.id, accountDeck.id]);

    expect(await database.table("resources").get(starter.id)).toMatchObject({
      archived: true,
    });
    expect(await database.table("resources").get(accountDeck.id)).toBeUndefined();
    expect(accountData.saveTracked).toHaveBeenCalledWith(
      expect.objectContaining({ id: starter.id, archived: true })
    );
    expect(accountData.tombstoneTracked).toHaveBeenCalledWith(accountDeck.id);
  });

  it("resets only Prompt decks while recording account retirement", async () => {
    const database = createTherapyStudioDatabase({
      name: `prompt-library-reset-${crypto.randomUUID()}`,
      indexedDB,
      IDBKeyRange,
    });
    databases.push(database);
    const accountData = {
      getDeckSyncRecords: vi.fn(
        async () =>
          new Map([
            ["account-deck", { id: "account-deck", deletedAt: null, status: "saved" }],
          ])
      ),
      getPromptLibraryReset: vi.fn(async () => null),
      isAvailable: vi.fn(() => true),
      reconcile: vi.fn(async () => ({ status: "saved" })),
      savePromptLibraryReset: vi.fn(async () => ({ status: "saved", tracked: true })),
      tombstoneDecks: vi.fn(async () => ({ status: "saved", tracked: true })),
      trackCreated: vi.fn(async () => ({ tracked: true })),
    };
    const repository = createPromptDeckRepository({
      accountData,
      createId: () => "account-deck",
      database,
      now: () => "2026-08-03T12:00:00.000Z",
    });
    await repository.seedImportedPromptDecks([promptDecks[0]]);
    await database.table("categories").add({
      archived: false,
      color: "#6C46C3",
      createdAt: "2026-08-03T11:00:00.000Z",
      iconId: "prompt-default",
      id: "starter-category",
      name: "Starter Category",
      sortOrder: 0,
      updatedAt: "2026-08-03T11:00:00.000Z",
    });
    const accountDeck = await repository.createPromptDeck({ title: "Account deck" });
    const playlists = createPlaylistRepository({ database, now: () => times[0] });
    const playlist = await playlists.createPlaylist({ title: "Prompt links" });
    await playlists.addPlaylistItem(playlist.id, {
      deckId: accountDeck.id,
      type: "prompt-deck",
    });

    await expect(repository.previewPromptLibraryReset()).resolves.toMatchObject({
      activeDeckCount: 2,
      activeCategoryCount: 1,
      builtInDeckCount: 1,
      therapistDeckCount: 1,
    });
    await repository.resetPromptLibrary();

    expect(await repository.getAllPromptDecks({ includeArchived: true })).toEqual([]);
    expect(await database.table("categories").get("starter-category")).toMatchObject({
      archived: false,
    });
    expect((await playlists.getPlaylistById(playlist.id)).items).toEqual([]);
    expect(accountData.savePromptLibraryReset).toHaveBeenLastCalledWith(
      expect.objectContaining({
        phase: "complete",
        retiredStarterIds: expect.arrayContaining([promptDecks[0].id]),
      })
    );
    expect(accountData.tombstoneDecks).toHaveBeenCalledWith(["account-deck"]);
  });

  it("leaves categories unchanged when another signed-in browser observes a deck reset", async () => {
    const { database } = setup();
    await database.table("categories").bulkAdd([
      {
        archived: false,
        color: "#6C46C3",
        createdAt: "2026-08-03T11:00:00.000Z",
        iconId: "prompt-default",
        id: "old-category",
        name: "Old",
        sortOrder: 0,
        updatedAt: "2026-08-03T11:00:00.000Z",
      },
      {
        archived: false,
        color: "#2D7D73",
        createdAt: "2026-08-03T13:00:00.000Z",
        iconId: "ideas",
        id: "new-category",
        name: "New",
        sortOrder: 1,
        updatedAt: "2026-08-03T13:00:00.000Z",
      },
    ]);
    const accountData = {
      getPromptLibraryReset: vi.fn(async () => ({
        phase: "complete",
        resetAt: "2026-08-03T12:00:00.000Z",
      })),
    };
    const repository = createPromptDeckRepository({ accountData, database });

    await repository.getPromptLibraryReset({ completedOnly: true });

    expect(await database.table("categories").get("old-category")).toMatchObject({
      archived: false,
    });
    expect(await database.table("categories").get("new-category")).toMatchObject({
      archived: false,
    });
  });

  it("does not remove local decks when the reset marker cannot be confirmed", async () => {
    const { database } = setup();
    const accountData = {
      getDeckSyncRecords: vi.fn(async () => new Map()),
      getPromptLibraryReset: vi.fn(async () => null),
      isAvailable: vi.fn(() => true),
      reconcile: vi.fn(async () => ({ status: "saved" })),
      savePromptLibraryReset: vi.fn(async () => ({ status: "offline-saved-locally" })),
      tombstoneDecks: vi.fn(async () => ({ status: "saved" })),
    };
    const repository = createPromptDeckRepository({ accountData, database });
    await repository.seedImportedPromptDecks([promptDecks[0]]);

    await expect(repository.resetPromptLibrary()).rejects.toMatchObject({
      code: "authoring-transaction-failed",
    });
    await expect(repository.getPromptDeckById(promptDecks[0].id)).resolves.toMatchObject({
      title: promptDecks[0].title,
    });
  });

  it("requires configured authenticated Account Data before any reset work", async () => {
    const { repository } = setup();
    await repository.seedImportedPromptDecks([promptDecks[0]]);

    await expect(repository.resetPromptLibrary()).rejects.toMatchObject({
      code: "authoring-transaction-failed",
    });
    await expect(repository.getPromptDeckById(promptDecks[0].id)).resolves.toMatchObject({
      title: promptDecks[0].title,
    });
  });

  it("does not remove local decks when account deck tombstones cannot be confirmed", async () => {
    const { database } = setup();
    const accountData = {
      getDeckSyncRecords: vi.fn(
        async () =>
          new Map([
            ["cloud-deck", { deletedAt: null, id: "cloud-deck", status: "saved" }],
          ])
      ),
      getPromptLibraryReset: vi.fn(async () => null),
      isAvailable: vi.fn(() => true),
      reconcile: vi.fn(async () => ({ status: "saved" })),
      savePromptLibraryReset: vi.fn(async () => ({ status: "saved" })),
      tombstoneDecks: vi.fn(async () => ({ status: "offline-saved-locally" })),
      trackCreated: vi.fn(async () => ({ status: "saved", tracked: true })),
    };
    const repository = createPromptDeckRepository({
      accountData,
      createId: () => "cloud-deck",
      database,
    });
    const deck = await repository.createPromptDeck({ title: "Still local" });

    await expect(repository.resetPromptLibrary()).rejects.toMatchObject({
      code: "authoring-transaction-failed",
    });
    await expect(repository.getPromptDeckById(deck.id)).resolves.toMatchObject({
      title: "Still local",
    });
  });

  it("retries a pending reset idempotently before removing local decks", async () => {
    const { database } = setup();
    let pending = null;
    let tombstoneAttempt = 0;
    const accountData = {
      getDeckSyncRecords: vi.fn(async () => new Map()),
      getPromptLibraryReset: vi.fn(async () => pending),
      isAvailable: vi.fn(() => true),
      reconcile: vi.fn(async () => ({ status: "saved" })),
      savePromptLibraryReset: vi.fn(async (content) => {
        pending = content;
        return { status: "saved" };
      }),
      tombstoneDecks: vi.fn(async () => ({
        status: ++tombstoneAttempt === 1 ? "offline-saved-locally" : "saved",
      })),
    };
    const repository = createPromptDeckRepository({ accountData, database });
    await repository.seedImportedPromptDecks([promptDecks[0]]);

    await expect(repository.resetPromptLibrary()).rejects.toMatchObject({
      code: "authoring-transaction-failed",
    });
    await expect(repository.getPromptDeckById(promptDecks[0].id)).resolves.toBeTruthy();

    await repository.resetPromptLibrary();

    expect(await repository.getAllPromptDecks({ includeArchived: true })).toEqual([]);
    expect(accountData.savePromptLibraryReset).toHaveBeenLastCalledWith(
      expect.objectContaining({ phase: "complete" })
    );
  });

  it("creates a minimum valid deck without changing existing decks and reopens it", async () => {
    const { database, repository } = setup();
    const existing = promptDecks[0];
    await repository.seedImportedPromptDecks([existing]);

    const created = await repository.createPromptDeck({ title: "Minimum Deck" });
    const reopenedRepository = createPromptDeckRepository({ database });
    const reopened = await reopenedRepository.getPromptDeckById(created.id);

    expect(reopened).toMatchObject({
      id: created.id,
      title: "Minimum Deck",
      prompts: [],
      archived: false,
    });
    expect(await reopenedRepository.getPromptDeckById(existing.id)).toMatchObject(
      existing
    );
    await expect(repository.createPromptDeck({ title: "" })).rejects.toMatchObject({
      code: "invalid-authoring-input",
    });
  });

  it("adds, bulk adds, edits, duplicates, deletes, and reorders prompts", async () => {
    const { repository } = setup();
    let deck = await repository.createPromptDeck({ title: "Editable" });
    deck = await repository.addPrompt(deck.id, { text: "One" });
    deck = await repository.bulkAddPrompts(deck.id, ["Two", "", "Two", "Three!"]);
    expect(deck.prompts.map(({ text }) => text)).toEqual(["One", "Two", "Two", "Three!"]);
    const firstId = deck.prompts[0].id;
    deck = await repository.updatePrompt(deck.id, firstId, {
      text: "Updated",
      goals: ["Connect"],
    });
    expect(deck.prompts[0]).toMatchObject({ text: "Updated", goals: ["Connect"] });
    deck = await repository.duplicatePrompt(deck.id, firstId);
    expect(new Set(deck.prompts.map(({ id }) => id)).size).toBe(deck.prompts.length);
    deck = await repository.deletePrompt(deck.id, firstId);
    const reversed = deck.prompts.map(({ id }) => id).reverse();
    deck = await repository.reorderPrompts(deck.id, reversed);
    expect(deck.prompts.map(({ id }) => id)).toEqual(reversed);
  });

  it("persists card visual overrides without copying the deck visual", async () => {
    const { repository } = setup();
    let deck = await repository.createPromptDeck({
      title: "Visuals",
      iconId: "ideas",
    });
    deck = await repository.addPrompt(deck.id, { text: "Default visual" });
    deck = await repository.addPrompt(deck.id, {
      text: "Card visual",
      iconId: "reading",
    });

    expect(deck.prompts[0]).not.toHaveProperty("iconId");
    expect(deck.prompts[1].iconId).toBe("reading");

    await repository.updatePromptDeck(deck.id, { iconId: "calm" });
    const reopened = await repository.getPromptDeckById(deck.id);
    expect(reopened.iconId).toBe("calm");
    expect(reopened.prompts[0]).not.toHaveProperty("iconId");
    expect(reopened.prompts[1].iconId).toBe("reading");

    const restored = await repository.updatePrompt(deck.id, reopened.prompts[1].id, {
      iconId: null,
    });
    expect(restored.prompts[1].iconId).toBeNull();
  });

  it("moves and copies prompts transactionally between decks", async () => {
    const { repository } = setup();
    const source = await repository.createPromptDeck({ title: "Source" });
    const target = await repository.createPromptDeck({ title: "Target" });
    const withPrompt = await repository.addPrompt(source.id, { text: "Transfer me" });
    const promptId = withPrompt.prompts[0].id;
    await repository.copyPrompt(source.id, promptId, target.id);
    expect((await repository.getPromptDeckById(source.id)).prompts).toHaveLength(1);
    expect((await repository.getPromptDeckById(target.id)).prompts[0].id).not.toBe(
      promptId
    );
    await repository.movePrompt(source.id, promptId, target.id, 0);
    expect((await repository.getPromptDeckById(source.id)).prompts).toHaveLength(0);
    expect((await repository.getPromptDeckById(target.id)).prompts[0].id).toBe(promptId);
  });

  it("rejects invalid fields and rolls back an invalid bulk batch", async () => {
    const { repository } = setup();
    const deck = await repository.createPromptDeck({ title: "Safe" });
    await expect(
      repository.updatePromptDeck(deck.id, { unknown: true })
    ).rejects.toMatchObject({
      code: "invalid-authoring-input",
    });
    await expect(repository.bulkAddPrompts(deck.id, ["", "   "])).rejects.toMatchObject({
      code: "invalid-authoring-input",
    });
    expect((await repository.getPromptDeckById(deck.id)).prompts).toEqual([]);
  });

  it("rolls back the whole bulk transaction when generation fails mid-batch", async () => {
    const database = createTherapyStudioDatabase({
      name: `prompt-deck-rollback-${crypto.randomUUID()}`,
      indexedDB,
      IDBKeyRange,
    });
    databases.push(database);
    let calls = 0;
    const repository = createPromptDeckRepository({
      database,
      now: () => times[0],
      createId: () => {
        calls += 1;
        if (calls === 3) throw new Error("ID generation failed");
        return `generated-${calls}`;
      },
    });
    const deck = await repository.createPromptDeck({ title: "Rollback" });
    await expect(
      repository.bulkAddPrompts(deck.id, ["One", "Two"])
    ).rejects.toMatchObject({
      code: "authoring-transaction-failed",
    });
    expect((await repository.getPromptDeckById(deck.id)).prompts).toEqual([]);
  });
});
