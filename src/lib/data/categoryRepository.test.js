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

  it("rejects duplicate names without case sensitivity", async () => {
    const { repository } = setup();
    await repository.createCategory({ name: "Play" });
    await expect(repository.createCategory({ name: " play " })).rejects.toMatchObject({
      code: "duplicate-authoring-record",
    });
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
