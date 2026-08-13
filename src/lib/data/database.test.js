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
  THERAPY_STUDIO_VERSION_4_SCHEMA,
  THERAPY_STUDIO_VERSION_5_SCHEMA,
  THERAPY_STUDIO_VERSION_6_SCHEMA,
  THERAPY_STUDIO_VERSION_7_SCHEMA,
  THERAPY_STUDIO_VERSION_8_SCHEMA,
  THERAPY_STUDIO_VERSION_9_SCHEMA,
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
    expect(THERAPY_STUDIO_DATABASE_LATEST_VERSION).toBe(9);
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
    expect(THERAPY_STUDIO_VERSION_4_SCHEMA.sessionProfiles).toBe(
      "id, archived, updatedAt, lastOpenedAt"
    );
    expect(THERAPY_STUDIO_VERSION_5_SCHEMA.worksheetDocuments).toBe("worksheetId");
    expect(THERAPY_STUDIO_VERSION_6_SCHEMA.sceneDocuments).toBe("id, updatedAt");
    expect(THERAPY_STUDIO_VERSION_7_SCHEMA.interventionGuidance).toBe("resourceId");
    expect(THERAPY_STUDIO_VERSION_8_SCHEMA.whiteboardDocuments).toBe("id, updatedAt");
    expect(THERAPY_STUDIO_VERSION_9_SCHEMA.localMediaAssets).toBe("id, createdAt");
  });

  it("initializes version 9 with additive local media assets", async () => {
    const database = createTestDatabase();
    await database.open();

    expect(database.verno).toBe(9);
    expect(database.tables.map((table) => table.name).sort()).toEqual([
      "categories",
      "interventionGuidance",
      "localMediaAssets",
      "playlists",
      "resourceMemory",
      "resources",
      "sceneDocuments",
      "sessionProfiles",
      "whiteboardDocuments",
      "worksheetDocuments",
    ]);
    expect(database.table("resources").schema.primKey.name).toBe("id");
    expect(database.table("resources").schema.indexes).toEqual([]);
  });

  it("preserves version-8 Whiteboards during the local-media migration", async () => {
    const name = `therapy-studio-test-${crypto.randomUUID()}`;
    const versionEight = new Dexie(name, { indexedDB, IDBKeyRange });
    versionEight.version(8).stores(THERAPY_STUDIO_VERSION_8_SCHEMA);
    await versionEight.table("whiteboardDocuments").put({
      id: "whiteboard",
      title: "Kept",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    versionEight.close();
    const migrated = createTherapyStudioDatabase({ name, indexedDB, IDBKeyRange });
    databases.push(migrated);
    await migrated.open();
    expect(await migrated.table("whiteboardDocuments").get("whiteboard")).toBeTruthy();
    expect(await migrated.table("localMediaAssets").count()).toBe(0);
  });

  it("preserves version-7 data during the Whiteboard migration", async () => {
    const name = `therapy-studio-test-${crypto.randomUUID()}`;
    const versionSeven = new Dexie(name, { indexedDB, IDBKeyRange });
    versionSeven.version(7).stores(THERAPY_STUDIO_VERSION_7_SCHEMA);
    await versionSeven.table("resources").put({ id: "resource", title: "Kept" });
    await versionSeven
      .table("interventionGuidance")
      .put({ resourceId: "intervention", steps: [] });
    versionSeven.close();
    const migrated = createTherapyStudioDatabase({ name, indexedDB, IDBKeyRange });
    databases.push(migrated);
    await migrated.open();
    expect(await migrated.table("resources").get("resource")).toBeTruthy();
    expect(await migrated.table("interventionGuidance").get("intervention")).toBeTruthy();
    expect(await migrated.table("whiteboardDocuments").count()).toBe(0);
  });

  it("preserves version-6 data during the Intervention guidance migration", async () => {
    const name = `therapy-studio-test-${crypto.randomUUID()}`;
    const versionSix = new Dexie(name, { indexedDB, IDBKeyRange });
    versionSix.version(6).stores(THERAPY_STUDIO_VERSION_6_SCHEMA);
    await versionSix.table("resources").put({ id: "resource", title: "Kept" });
    await versionSix
      .table("sceneDocuments")
      .put({ id: "scene", updatedAt: "2026-01-01T00:00:00.000Z" });
    versionSix.close();
    const migrated = createTherapyStudioDatabase({ name, indexedDB, IDBKeyRange });
    databases.push(migrated);
    await migrated.open();
    expect(await migrated.table("resources").get("resource")).toBeTruthy();
    expect(await migrated.table("sceneDocuments").get("scene")).toBeTruthy();
    expect(await migrated.table("interventionGuidance").count()).toBe(0);
  });

  it("preserves version-5 data during the Scene Document migration", async () => {
    const name = `therapy-studio-test-${crypto.randomUUID()}`;
    const versionFive = new Dexie(name, { indexedDB, IDBKeyRange });
    versionFive.version(5).stores(THERAPY_STUDIO_VERSION_5_SCHEMA);
    await versionFive.table("resources").put({ id: "resource", title: "Kept" });
    await versionFive
      .table("worksheetDocuments")
      .put({ worksheetId: "worksheet", documentVersion: 1 });
    versionFive.close();

    const migrated = createTherapyStudioDatabase({ name, indexedDB, IDBKeyRange });
    databases.push(migrated);
    await migrated.open();

    expect(await migrated.table("resources").get("resource")).toBeTruthy();
    expect(await migrated.table("worksheetDocuments").get("worksheet")).toBeTruthy();
    expect(await migrated.table("sceneDocuments").count()).toBe(0);
  });

  it("preserves version-4 data during the Worksheet migration", async () => {
    const name = `therapy-studio-test-${crypto.randomUUID()}`;
    const versionFour = new Dexie(name, { indexedDB, IDBKeyRange });
    versionFour.version(4).stores(THERAPY_STUDIO_VERSION_4_SCHEMA);
    await versionFour.table("resources").put({ id: "resource", title: "Kept" });
    await versionFour
      .table("sessionProfiles")
      .put({ id: "profile", displayName: "Kept" });
    versionFour.close();

    const migrated = createTherapyStudioDatabase({ name, indexedDB, IDBKeyRange });
    databases.push(migrated);
    await migrated.open();

    expect(await migrated.table("resources").get("resource")).toBeTruthy();
    expect(await migrated.table("sessionProfiles").get("profile")).toBeTruthy();
    expect(await migrated.table("worksheetDocuments").count()).toBe(0);
  });

  it("preserves version-3 data during the Session Profile migration", async () => {
    const name = `therapy-studio-test-${crypto.randomUUID()}`;
    const versionThree = new Dexie(name, { indexedDB, IDBKeyRange });
    versionThree.version(3).stores(THERAPY_STUDIO_VERSION_3_SCHEMA);
    await versionThree.table("resources").put({ id: "resource", title: "Kept" });
    await versionThree
      .table("resourceMemory")
      .put({ resourceId: "resource", favorite: true });
    versionThree.close();
    const migrated = createTherapyStudioDatabase({ name, indexedDB, IDBKeyRange });
    databases.push(migrated);
    await migrated.open();
    expect(await migrated.table("resources").get("resource")).toBeTruthy();
    expect(await migrated.table("resourceMemory").get("resource")).toBeTruthy();
    expect(await migrated.table("sessionProfiles").count()).toBe(0);
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
