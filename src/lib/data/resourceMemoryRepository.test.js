import { afterEach, describe, expect, it } from "vitest";

import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import { createTherapyStudioDatabase } from "./database";
import {
  createResourceMemoryRepository,
  resourceMemoryErrorCodes,
} from "./resourceMemoryRepository";

const databases = [];
const times = [
  "2026-08-04T12:00:00.000Z",
  "2026-08-04T12:01:00.000Z",
  "2026-08-04T12:02:00.000Z",
  "2026-08-04T12:03:00.000Z",
  "2026-08-04T12:04:00.000Z",
];

function setup() {
  const database = createTherapyStudioDatabase({
    name: `therapy-studio-test-memory-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  });
  databases.push(database);
  let time = 0;
  return {
    database,
    repository: createResourceMemoryRepository({
      database,
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

describe("resourceMemoryRepository", () => {
  it("returns defaults lazily and rejects unknown Resources", async () => {
    const { database, repository } = setup();
    const memory = await repository.getResourceMemory("intervention-feelings-jenga");
    expect(memory).toMatchObject({ favorite: false, rating: null, useCount: 0 });
    expect(await database.table("resourceMemory").count()).toBe(0);
    await expect(repository.getResourceMemory("unknown-resource")).rejects.toMatchObject({
      code: resourceMemoryErrorCodes.resourceNotFound,
    });
  });

  it("persists favorite, rating, notes, arrays, and stable lifecycle fields", async () => {
    const { repository } = setup();
    const id = "intervention-feelings-jenga";
    const favorite = await repository.toggleFavorite(id);
    expect(favorite.favorite).toBe(true);
    const createdAt = favorite.createdAt;
    expect((await repository.toggleFavorite(id)).favorite).toBe(false);
    expect((await repository.setRating(id, 5)).rating).toBe(5);
    expect((await repository.clearRating(id)).rating).toBeNull();
    expect(
      (await repository.updateTherapistNotes(id, "First line\nSecond line"))
        .therapistNotes
    ).toBe("First line\nSecond line");
    expect(
      (await repository.updateWorksWellWhen(id, ["Shutdown", "shutdown", ""]))
        .worksWellWhen
    ).toEqual(["Shutdown"]);
    expect(
      (await repository.updateKidsWhoUsuallyLikeThis(id, ["Animals"]))
        .kidsWhoUsuallyLikeThis
    ).toEqual(["Animals"]);
    const final = await repository.updateAdaptations(id, ["Offer drawing"]);
    expect(final.adaptations).toEqual(["Offer drawing"]);
    expect(final.createdAt).toBe(createdAt);
    expect(final.updatedAt).not.toBe(createdAt);
  });

  it("validates ratings, updates, and stored records", async () => {
    const { database, repository } = setup();
    await expect(
      repository.setRating("intervention-feelings-jenga", 0)
    ).rejects.toMatchObject({
      code: resourceMemoryErrorCodes.invalidRating,
    });
    await expect(
      repository.upsertResourceMemory("intervention-feelings-jenga", { unknown: true })
    ).rejects.toMatchObject({ code: resourceMemoryErrorCodes.invalidMemory });
    await database.table("resourceMemory").put({
      resourceId: "intervention-feelings-jenga",
      favorite: "yes",
    });
    await expect(
      repository.getResourceMemory("intervention-feelings-jenga")
    ).rejects.toMatchObject({ code: resourceMemoryErrorCodes.malformedStoredMemory });
  });

  it("increments meaningful use and returns deterministic collections", async () => {
    const { repository } = setup();
    const first = "intervention-feelings-jenga";
    const second = "1";
    await repository.markResourceUsed(first, "2026-08-04T10:00:00.000Z");
    await repository.markResourceUsed(first, "2026-08-04T11:00:00.000Z");
    await repository.markResourceUsed(second, "2026-08-04T11:00:00.000Z");
    await repository.toggleFavorite(first);
    await repository.setRating(first, 4);
    await repository.setRating(second, 5);

    expect((await repository.getResourceMemory(first)).useCount).toBe(2);
    expect(
      (await repository.getRecentlyUsedResources()).map(({ resource }) => resource.id)
    ).toEqual([second, first]);
    expect((await repository.getMostUsedResources())[0].resource.id).toBe(first);
    expect((await repository.getHighestRatedResources())[0].resource.id).toBe(second);
    expect((await repository.getFavoriteResources())[0].resource.id).toBe(first);
  });

  it("deletes memory without deleting the Resource and keeps test databases isolated", async () => {
    const first = setup();
    const second = setup();
    const id = "intervention-feelings-jenga";
    await first.repository.toggleFavorite(id);
    await first.repository.deleteResourceMemoryPermanently(id);
    expect((await first.repository.getResourceMemory(id)).favorite).toBe(false);
    expect(await first.database.table("resources").count()).toBe(0);
    expect(await second.database.table("resourceMemory").count()).toBe(0);
  });
});
