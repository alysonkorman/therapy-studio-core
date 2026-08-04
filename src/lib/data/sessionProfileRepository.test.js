import { afterEach, describe, expect, it } from "vitest";
import { createTherapyStudioDatabase } from "./database";
import { createSessionProfileRepository } from "./sessionProfileRepository";
import { IDBKeyRange, indexedDB } from "../../test/indexedDb";

const databases = [];
const timestamps = [
  "2026-08-04T12:00:00.000Z",
  "2026-08-04T12:01:00.000Z",
  "2026-08-04T12:02:00.000Z",
];
function setup() {
  const database = createTherapyStudioDatabase({
    name: `therapy-studio-test-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  });
  databases.push(database);
  let time = 0;
  let id = 0;
  return {
    database,
    repository: createSessionProfileRepository({
      database,
      now: () => timestamps[Math.min(time++, 2)],
      createId: () => `profile-${++id}`,
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

describe("Session Profile repository", () => {
  it("creates, reads, updates, opens, searches, archives, restores, duplicates, and deletes", async () => {
    const { repository } = setup();
    const created = await repository.createSessionProfile({
      displayName: "Dinosaur Kid",
      interests: ["Dinosaurs"],
    });
    expect((await repository.getSessionProfileById(created.id)).createdAt).toBe(
      created.createdAt
    );
    const updated = await repository.updateSessionProfile(created.id, {
      goals: ["Rapport"],
    });
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).not.toBe(created.updatedAt);
    expect(await repository.searchSessionProfiles("dinosaur")).toHaveLength(1);
    expect(
      (await repository.markSessionProfileOpened(created.id, timestamps[2])).lastOpenedAt
    ).toBe(timestamps[2]);
    const copy = await repository.duplicateSessionProfile(created.id);
    expect(copy.id).not.toBe(created.id);
    expect(copy.displayName).toMatch(/Copy$/);
    await repository.archiveSessionProfile(created.id);
    expect(await repository.getAllSessionProfiles()).toHaveLength(1);
    await repository.restoreSessionProfile(created.id);
    expect(await repository.getAllSessionProfiles()).toHaveLength(2);
    await repository.deleteSessionProfilePermanently(copy.id);
    await expect(repository.getSessionProfileById(copy.id)).rejects.toMatchObject({
      code: "profile-not-found",
    });
  });
  it("rejects duplicate IDs, invalid updates, malformed storage, and isolates test clearing", async () => {
    const { database, repository } = setup();
    await repository.createSessionProfile({ id: "fixed", displayName: "Safe Label" });
    await expect(
      repository.createSessionProfile({ id: "fixed", displayName: "Another" })
    ).rejects.toMatchObject({ code: "duplicate-profile" });
    await expect(
      repository.updateSessionProfile("fixed", { id: "changed" })
    ).rejects.toMatchObject({ code: "invalid-update" });
    await database.table("sessionProfiles").put({ id: "broken" });
    await expect(repository.getSessionProfileById("broken")).rejects.toMatchObject({
      code: "malformed-stored-profile",
    });
    await repository.clearSessionProfilesForTests();
    expect(await database.table("sessionProfiles").count()).toBe(0);
  });
});
