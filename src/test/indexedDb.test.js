import Dexie from "dexie";
import { describe, expect, it } from "vitest";

import { IDBKeyRange, indexedDB } from "./indexedDb";

describe("IndexedDB test dependencies", () => {
  it("supplies IndexedDB and IDBKeyRange explicitly to a temporary Dexie database", async () => {
    expect(indexedDB).toBeDefined();
    expect(IDBKeyRange).toBeDefined();

    const database = new Dexie(`therapy-studio-test-${crypto.randomUUID()}`, {
      IDBKeyRange,
      indexedDB,
    });
    database.version(1).stores({ probe: "id" });

    try {
      await database.open();
      expect(database.isOpen()).toBe(true);
      expect(database.tables.map((table) => table.name)).toEqual(["probe"]);
    } finally {
      database.close();
      await database.delete();
    }
  });
});
