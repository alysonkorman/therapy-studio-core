import { afterEach, describe, expect, it } from "vitest";

import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import { createTherapyStudioDatabase } from "./database";
import { createLocalMediaRepository } from "./localMediaRepository";

const databases = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()));
});

describe("local media repository", () => {
  it("stores and resolves local Blob media by stable ID", async () => {
    const database = createTherapyStudioDatabase({
      name: `local-media-${crypto.randomUUID()}`,
      indexedDB,
      IDBKeyRange,
    });
    databases.push(database);
    const repository = createLocalMediaRepository({
      database,
      createId: () => "asset-1",
      now: () => "2026-08-13T12:00:00.000Z",
    });
    const blob = new Blob(["image"], { type: "image/png" });
    const saved = await repository.saveAsset({ blob, width: 640, height: 480 });
    expect(saved).toMatchObject({ id: "asset-1", mimeType: "image/png" });
    const loaded = await repository.getAsset("asset-1");
    expect(loaded.blob).toMatchObject({ size: 5, type: "image/png" });
    await repository.deleteAsset("asset-1");
    expect(await repository.getAsset("asset-1")).toBeNull();
  });
});
