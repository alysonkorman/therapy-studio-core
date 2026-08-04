import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import {
  createTherapyStudioDatabase,
  THERAPY_STUDIO_DATABASE_LATEST_VERSION,
  THERAPY_STUDIO_DATABASE_NAME,
  THERAPY_STUDIO_DATABASE_VERSION,
  THERAPY_STUDIO_VERSION_1_SCHEMA,
  THERAPY_STUDIO_VERSION_2_SCHEMA,
  THERAPY_STUDIO_VERSION_3_SCHEMA,
} from "./database";

const databases = [];

function createTestDatabase() {
  const database = createTherapyStudioDatabase({
    name: `therapy-studio-test-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  });
  databases.push(database);
  return database;
}

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    })
  );
});

describe("Therapy Studio database", () => {
  it("declares the application name and additive schemas", () => {
    expect(THERAPY_STUDIO_DATABASE_NAME).toBe("therapy-studio");
    expect(THERAPY_STUDIO_DATABASE_VERSION).toBe(1);
    expect(THERAPY_STUDIO_VERSION_1_SCHEMA).toEqual({ resources: "id" });
    expect(THERAPY_STUDIO_DATABASE_LATEST_VERSION).toBe(3);
    expect(THERAPY_STUDIO_VERSION_2_SCHEMA).toEqual({
      resources: "id",
      categories: "id",
      playlists: "id",
    });
    expect(THERAPY_STUDIO_VERSION_3_SCHEMA).toEqual({
      resources: "id",
      categories: "id",
      playlists: "id",
      resourceMemory: "resourceId, favorite, rating, lastUsedAt, useCount",
    });
  });

  it("initializes version 3 with additive authoring and Resource Memory tables", async () => {
    const database = createTestDatabase();
    await database.open();

    expect(database.verno).toBe(3);
    expect(database.tables.map((table) => table.name).sort()).toEqual([
      "categories",
      "playlists",
      "resourceMemory",
      "resources",
    ]);
    expect(database.table("resources").schema.primKey.name).toBe("id");
    expect(database.table("resources").schema.indexes).toEqual([]);
  });

  it("preserves version-2 authoring data during the Resource Memory migration", async () => {
    const name = `therapy-studio-test-${crypto.randomUUID()}`;
    const versionTwo = new Dexie(name, { indexedDB, IDBKeyRange });
    versionTwo.version(2).stores(THERAPY_STUDIO_VERSION_2_SCHEMA);
    await versionTwo.table("resources").put({ id: "resource", title: "Kept" });
    await versionTwo.table("categories").put({ id: "category", name: "Kept" });
    await versionTwo.table("playlists").put({ id: "playlist", title: "Kept" });
    versionTwo.close();

    const migrated = createTherapyStudioDatabase({ name, indexedDB, IDBKeyRange });
    databases.push(migrated);
    await migrated.open();

    expect(await migrated.table("resources").get("resource")).toBeTruthy();
    expect(await migrated.table("categories").get("category")).toBeTruthy();
    expect(await migrated.table("playlists").get("playlist")).toBeTruthy();
    expect(await migrated.table("resourceMemory").count()).toBe(0);
  });

  it("preserves version-1 Resource data during the additive migration", async () => {
    const name = `therapy-studio-test-${crypto.randomUUID()}`;
    const versionOne = new Dexie(name, { indexedDB, IDBKeyRange });
    versionOne.version(1).stores(THERAPY_STUDIO_VERSION_1_SCHEMA);
    await versionOne.table("resources").put({ id: "existing-resource", title: "Kept" });
    versionOne.close();

    const migrated = createTherapyStudioDatabase({ name, indexedDB, IDBKeyRange });
    databases.push(migrated);
    await migrated.open();

    expect(await migrated.table("resources").get("existing-resource")).toMatchObject({
      title: "Kept",
    });
    expect(migrated.tables.map((table) => table.name)).toEqual(
      expect.arrayContaining(["categories", "playlists"])
    );
  });

  it("keeps temporary databases isolated", async () => {
    const first = createTestDatabase();
    const second = createTestDatabase();
    await first.table("resources").put({ id: "only-in-first" });

    expect(await first.table("resources").count()).toBe(1);
    expect(await second.table("resources").count()).toBe(0);
    expect(first.name).not.toBe(second.name);
    expect(first.name).not.toBe(THERAPY_STUDIO_DATABASE_NAME);
  });

  it("deletes test databases cleanly", async () => {
    const database = createTestDatabase();
    const name = database.name;
    await database.table("resources").put({ id: "temporary" });
    database.close();
    await database.delete();

    const reopened = createTherapyStudioDatabase({ name, indexedDB, IDBKeyRange });
    databases.push(reopened);
    expect(await reopened.table("resources").count()).toBe(0);
  });
});
