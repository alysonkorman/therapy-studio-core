import { afterEach, describe, expect, it } from "vitest";

import { promptDecks } from "../../data/resources/promptDecks";
import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import { createTherapyStudioDatabase } from "./database";
import { createPromptDeckRepository } from "./promptDeckRepository";

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
