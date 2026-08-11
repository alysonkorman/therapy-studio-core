import { afterEach, describe, expect, it } from "vitest";

import { interventionGuidanceSchema, resourceSchema } from "../../models";
import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import { createTherapyStudioDatabase } from "./database";
import {
  createInterventionRepository,
  interventionRepositoryErrorCodes,
} from "./interventionRepository";
import { createResourceMemoryRepository } from "./resourceMemoryRepository";

const databases = [];
const timestamp = "2026-08-11T12:00:00.000Z";

function setup() {
  const database = createTherapyStudioDatabase({
    name: `intervention-repository-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  });
  databases.push(database);
  return { database, repository: createInterventionRepository({ database }) };
}

function pair(id, title = `Imported ${id}`) {
  return {
    resource: resourceSchema.parse({
      id,
      type: "intervention",
      title,
      source: "Alyson’s reviewed collection",
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
    guidance: interventionGuidanceSchema.parse({
      resourceId: id,
      overview: "A reviewed therapist activity.",
      introduction: "Let’s try this together.",
      steps: ["Begin with one small step."],
      sourceStatus: "Alyson’s reviewed collection",
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

describe("interventionRepository", () => {
  it("combines eight bundled starters with persisted Interventions", async () => {
    const { repository } = setup();
    await repository.createIntervention(pair("custom-grounding", "Custom Grounding"));
    const all = await repository.getAllInterventions();

    expect(all).toHaveLength(9);
    expect(all.find(({ id }) => id === "intervention-feelings-jenga")).toMatchObject({
      starter: true,
    });
    expect(all.find(({ id }) => id === "custom-grounding")).toMatchObject({
      starter: false,
      title: "Custom Grounding",
    });
  });

  it("persists Resource/guidance pairs transactionally and survives reload", async () => {
    const { database, repository } = setup();
    const imported = pair("persistent-intervention");
    await repository.importInterventions([imported]);
    const reopened = createInterventionRepository({ database });

    expect(await reopened.getInterventionPair(imported.resource.id)).toMatchObject({
      resource: { id: imported.resource.id, source: "Alyson’s reviewed collection" },
      guidance: {
        resourceId: imported.resource.id,
        sourceStatus: "Alyson’s reviewed collection",
      },
    });
  });

  it("rejects duplicate, existing Resource, and starter IDs without partial writes", async () => {
    const { database, repository } = setup();
    await database.open();
    await database.table("resources").add({
      ...pair("occupied").resource,
      type: "activity",
      archived: false,
    });

    await expect(
      repository.importInterventions([pair("new-one"), pair("occupied")])
    ).rejects.toMatchObject({ code: interventionRepositoryErrorCodes.conflict });
    expect(await database.table("resources").get("new-one")).toBeUndefined();
    expect(await database.table("interventionGuidance").get("new-one")).toBeUndefined();
    await expect(
      repository.importInterventions([pair("same"), pair("same")])
    ).rejects.toMatchObject({ code: interventionRepositoryErrorCodes.invalidPair });
    await expect(
      repository.createIntervention(pair("intervention-feelings-jenga"))
    ).rejects.toMatchObject({ code: interventionRepositoryErrorCodes.conflict });
  });

  it("deletes only persisted Interventions with guidance and Resource Memory", async () => {
    const { database, repository } = setup();
    const imported = pair("deletable");
    await repository.createIntervention(imported);
    await database.table("resourceMemory").put({
      resourceId: imported.resource.id,
      favorite: true,
    });
    await repository.deleteInterventionPermanently(imported.resource.id);

    expect(await database.table("resources").get(imported.resource.id)).toBeUndefined();
    expect(
      await database.table("interventionGuidance").get(imported.resource.id)
    ).toBeUndefined();
    expect(
      await database.table("resourceMemory").get(imported.resource.id)
    ).toBeUndefined();
    await expect(
      repository.deleteInterventionPermanently("intervention-feelings-jenga")
    ).rejects.toMatchObject({
      code: interventionRepositoryErrorCodes.protectedStarter,
    });
  });

  it("uses existing Resource Memory and Saved collections for imported Interventions", async () => {
    const { database, repository } = setup();
    const imported = pair("favorite-imported");
    await repository.createIntervention(imported);
    const memory = createResourceMemoryRepository({ database, now: () => timestamp });
    await memory.toggleFavorite(imported.resource.id);
    const favorites = await memory.getFavoriteResources();
    expect(favorites).toHaveLength(1);
    expect(favorites[0].resource).toMatchObject({
      id: imported.resource.id,
      type: "intervention",
    });
  });
});
