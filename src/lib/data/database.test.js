import { afterEach, describe, expect, it } from "vitest";

import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import {
  createTherapyStudioDatabase,
  THERAPY_STUDIO_DATABASE_NAME,
  THERAPY_STUDIO_DATABASE_VERSION,
  THERAPY_STUDIO_VERSION_1_SCHEMA,
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
  it("declares the application name and version 1 Resource-only schema", () => {
    expect(THERAPY_STUDIO_DATABASE_NAME).toBe("therapy-studio");
    expect(THERAPY_STUDIO_DATABASE_VERSION).toBe(1);
    expect(THERAPY_STUDIO_VERSION_1_SCHEMA).toEqual({ resources: "id" });
  });

  it("initializes version 1 with only the resources table and stable-ID primary key", async () => {
    const database = createTestDatabase();
    await database.open();

    expect(database.verno).toBe(1);
    expect(database.tables.map((table) => table.name)).toEqual(["resources"]);
    expect(database.table("resources").schema.primKey.name).toBe("id");
    expect(database.table("resources").schema.indexes).toEqual([]);
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
