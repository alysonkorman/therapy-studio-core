import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { interventions } from "../../data/resources/interventions";
import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import { createTherapyStudioDatabase } from "./database";
import {
  createResourceRepository,
  resourceRepositoryErrorCodes,
} from "./resourceRepository";

const UPDATED_AT = "2026-08-03T15:00:00.000Z";
let database;
let repository;

function ordinaryResource(overrides = {}) {
  return {
    ...structuredClone(interventions[0]),
    id: "ordinary-resource",
    ...overrides,
  };
}

async function expectCode(promise, code) {
  await expect(promise).rejects.toMatchObject({ code });
}

beforeEach(() => {
  database = createTherapyStudioDatabase({
    name: `therapy-studio-test-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  });
  repository = createResourceRepository({ database, now: () => UPDATED_AT });
});

afterEach(async () => {
  database.close();
  await database.delete();
});

describe("Resource repository", () => {
  it("creates and reads a valid ordinary Resource", async () => {
    const resource = ordinaryResource();
    await expect(repository.createResourceRecord(resource)).resolves.toMatchObject({
      id: resource.id,
      archived: false,
    });
    await expect(repository.getResourceById(resource.id)).resolves.toMatchObject({
      ...resource,
      archived: false,
    });
  });

  it("rejects invalid Resources and unknown fields", async () => {
    await expectCode(
      repository.createResourceRecord({ ...ordinaryResource(), title: "" }),
      resourceRepositoryErrorCodes.invalidResource
    );
    await expectCode(
      repository.createResourceRecord({ ...ordinaryResource(), unexpected: true }),
      resourceRepositoryErrorCodes.invalidResource
    );
  });

  it("rejects duplicate IDs during ordinary creation", async () => {
    const resource = ordinaryResource();
    await repository.createResourceRecord(resource);
    await expectCode(
      repository.createResourceRecord(resource),
      resourceRepositoryErrorCodes.duplicateResource
    );
  });

  it("reports unknown Resource IDs", async () => {
    await expectCode(
      repository.getResourceById("missing"),
      resourceRepositoryErrorCodes.resourceNotFound
    );
    await expectCode(
      repository.archiveResource("missing"),
      resourceRepositoryErrorCodes.resourceNotFound
    );
    await expectCode(
      repository.restoreResource("missing"),
      resourceRepositoryErrorCodes.resourceNotFound
    );
  });

  it("returns Resources in deterministic ID order", async () => {
    await repository.createResourceRecord(ordinaryResource({ id: "z-resource" }));
    await repository.createResourceRecord(ordinaryResource({ id: "a-resource" }));

    expect((await repository.getAllResources()).map(({ id }) => id)).toEqual([
      "a-resource",
      "z-resource",
    ]);
  });

  it("updates valid fields while preserving createdAt and refreshing updatedAt", async () => {
    const resource = ordinaryResource();
    await repository.createResourceRecord(resource);

    const updated = await repository.updateResourceRecord(resource.id, {
      title: "Updated Feelings Jenga",
    });
    expect(updated.title).toBe("Updated Feelings Jenga");
    expect(updated.createdAt).toBe(resource.createdAt);
    expect(updated.updatedAt).toBe(UPDATED_AT);
  });

  it("rejects invalid and protected-field updates", async () => {
    const resource = ordinaryResource();
    await repository.createResourceRecord(resource);

    await expectCode(
      repository.updateResourceRecord(resource.id, { title: "" }),
      resourceRepositoryErrorCodes.invalidUpdate
    );
    await expectCode(
      repository.updateResourceRecord(resource.id, { id: "replacement" }),
      resourceRepositoryErrorCodes.invalidUpdate
    );
    expect(await repository.getResourceById(resource.id)).toMatchObject(resource);
  });

  it("archives, filters, includes, and restores Resources", async () => {
    const resource = ordinaryResource();
    await repository.createResourceRecord(resource);
    expect(await repository.archiveResource(resource.id)).toMatchObject({
      archived: true,
    });
    expect(await repository.getAllResources()).toEqual([]);
    expect(await repository.getAllResources({ includeArchived: true })).toHaveLength(1);

    expect(await repository.restoreResource(resource.id)).toMatchObject({
      archived: false,
    });
    expect(await repository.getAllResources()).toHaveLength(1);
  });

  it("permanently deletes only an existing Resource", async () => {
    const resource = ordinaryResource();
    await repository.createResourceRecord(resource);
    await repository.deleteResourcePermanently(resource.id);
    await expectCode(
      repository.getResourceById(resource.id),
      resourceRepositoryErrorCodes.resourceNotFound
    );
    await expectCode(
      repository.deleteResourcePermanently(resource.id),
      resourceRepositoryErrorCodes.resourceNotFound
    );
  });

  it("rejects malformed records found in storage", async () => {
    await database.table("resources").put({
      id: "malformed",
      archived: false,
      title: "Missing Resource type",
    });
    await expectCode(
      repository.getResourceById("malformed"),
      resourceRepositoryErrorCodes.malformedStoredRecord
    );
  });

  it("surfaces an unavailable IndexedDB API", async () => {
    const unavailableDatabase = createTherapyStudioDatabase({
      name: `therapy-studio-test-unavailable-${crypto.randomUUID()}`,
    });
    const unavailableRepository = createResourceRepository({
      database: unavailableDatabase,
    });
    await expectCode(
      unavailableRepository.getAllResources(),
      resourceRepositoryErrorCodes.databaseUnavailable
    );
    unavailableDatabase.close();
  });

  it("surfaces database-open failures", async () => {
    const failedRepository = createResourceRepository({
      database: {
        isOpen: () => false,
        open: () => Promise.reject(new Error("simulated open failure")),
      },
    });
    await expectCode(
      failedRepository.getAllResources(),
      resourceRepositoryErrorCodes.databaseOpenFailed
    );
  });

  it("surfaces ordinary write failures", async () => {
    const failWrite = () => {
      throw new Error("simulated write failure");
    };
    database.table("resources").hook("creating", failWrite);
    await expectCode(
      repository.createResourceRecord(ordinaryResource()),
      resourceRepositoryErrorCodes.writeFailed
    );
  });

  it("surfaces transaction failures during updates", async () => {
    const resource = ordinaryResource();
    await repository.createResourceRecord(resource);
    const failUpdate = () => {
      throw new Error("simulated transaction failure");
    };
    database.table("resources").hook("updating", failUpdate);

    await expectCode(
      repository.updateResourceRecord(resource.id, { title: "Will not persist" }),
      resourceRepositoryErrorCodes.transactionFailed
    );
    expect((await repository.getResourceById(resource.id)).title).toBe(resource.title);
  });

  it("clears only isolated test databases", async () => {
    await repository.createResourceRecord(ordinaryResource());
    await repository.clearResourceDatabaseForTests();
    expect(await repository.getAllResources()).toEqual([]);

    const nonTestRepository = createResourceRepository({
      database: { name: "therapy-studio" },
    });
    await expectCode(
      nonTestRepository.clearResourceDatabaseForTests(),
      resourceRepositoryErrorCodes.transactionFailed
    );
  });
});
