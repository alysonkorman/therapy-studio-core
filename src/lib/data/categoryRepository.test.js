import { afterEach, describe, expect, it } from "vitest";

import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import { createTherapyStudioDatabase } from "./database";
import { createCategoryRepository } from "./categoryRepository";

const databases = [];
const timestamp = "2026-08-03T12:00:00.000Z";

function setup() {
  const database = createTherapyStudioDatabase({
    name: `category-repository-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  });
  databases.push(database);
  let id = 0;
  return {
    database,
    repository: createCategoryRepository({
      database,
      now: () => timestamp,
      createId: () => `category-${++id}`,
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

describe("categoryRepository", () => {
  it("creates, renames, assigns appearance, archives, and restores categories", async () => {
    const { repository } = setup();
    const created = await repository.createCategory({ name: "Connection" });
    expect(created).toMatchObject({
      id: "category-1",
      color: "#6C46C3",
      archived: false,
    });

    const updated = await repository.updateCategory(created.id, {
      name: "Connecting",
      color: "#112233",
      iconId: "rabbit",
    });
    expect(updated).toMatchObject({
      name: "Connecting",
      color: "#112233",
      iconId: "rabbit",
    });
    expect((await repository.archiveCategory(created.id)).archived).toBe(true);
    expect((await repository.restoreCategory(created.id)).archived).toBe(false);
  });

  it("does not turn an existing category into a new account-owned category", async () => {
    const { repository } = setup();
    await repository.createCategory({ name: "Play" });

    await expect(
      repository.createCategory({
        name: " play ",
        color: "#112233",
        iconId: "rabbit",
      })
    ).rejects.toMatchObject({ code: "duplicate-authoring-record" });
    await expect(repository.getAllCategories()).resolves.toHaveLength(1);
  });

  it("does not restore an archived historical category when its name is used again", async () => {
    const { repository } = setup();
    const archived = await repository.createCategory({ name: "Conversation" });
    await repository.archiveCategory(archived.id);

    await expect(
      repository.createCategory({ name: " conversation " })
    ).rejects.toMatchObject({ code: "duplicate-authoring-record" });
    await expect(repository.getCategoryById(archived.id)).resolves.toMatchObject({
      archived: true,
    });
  });

  it("allows a current-taxonomy name to replace a historical category", async () => {
    const { database } = setup();
    const resetAt = "2026-08-04T12:00:00.000Z";
    const repository = createCategoryRepository({
      accountData: {
        getCurrentPromptTaxonomyGeneration: async () => resetAt,
      },
      database,
      createId: () => "current-act",
      now: () => "2026-08-05T12:00:00.000Z",
    });
    await database.table("categories").add({
      archived: true,
      color: "#6C46C3",
      createdAt: "2026-08-03T12:00:00.000Z",
      iconId: "prompt-default",
      id: "historical-act",
      name: "ACT",
      sortOrder: 0,
      updatedAt: "2026-08-03T12:00:00.000Z",
    });

    const category = await repository.createCategory({ name: "ACT" });

    expect(category).toMatchObject({
      id: "current-act",
      name: "ACT",
      taxonomyGeneration: resetAt,
    });
    await expect(repository.getAllCategories()).resolves.toMatchObject([
      { id: "current-act" },
    ]);
  });

  it("persists deterministic complete ordering", async () => {
    const { repository } = setup();
    const first = await repository.createCategory({ name: "First" });
    const second = await repository.createCategory({ name: "Second" });
    const ordered = await repository.reorderCategories([second.id, first.id]);
    expect(ordered.map(({ id }) => id)).toEqual([second.id, first.id]);
    await expect(repository.reorderCategories([first.id])).rejects.toMatchObject({
      code: "invalid-authoring-order",
    });
  });
});
