import { afterEach, describe, expect, it } from "vitest";

import { createTherapyStudioDatabase } from "../../lib/data/database";
import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import { createSavedSceneRepository } from "./savedSceneRepository";

const databases = [];

function setup() {
  const database = createTherapyStudioDatabase({
    name: `scene-repository-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  });
  databases.push(database);
  return createSavedSceneRepository({
    database,
    createId: () => "scene-1",
    now: () => "2026-08-09T20:00:00.000Z",
  });
}

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    })
  );
});

const workspaceDocument = {
  documentVersion: 1,
  background: "sand",
  objects: [
    {
      id: "dog-object",
      assetId: "animals/dog",
      assetKind: "icon",
      label: "Dog",
      x: 42,
      y: 81,
      width: 180,
      height: 120,
      rotation: -35,
    },
  ],
};

describe("savedSceneRepository", () => {
  it("round-trips only the versioned shared scene document and title", async () => {
    const repository = setup();
    const saved = await repository.saveScene({ title: "Sand Story", workspaceDocument });

    expect(saved).toMatchObject({
      id: "scene-1",
      documentVersion: 1,
      title: "Sand Story",
      workspaceDocument,
    });
    expect(await repository.getScene(saved.id)).toEqual(saved);
    expect(await repository.listScenes()).toEqual([saved]);
    expect(JSON.stringify(saved)).not.toMatch(/search|category|selection|menu/i);
  });

  it("updates an existing scene without changing its identity or creation time", async () => {
    const repository = setup();
    const first = await repository.saveScene({ title: "First", workspaceDocument });
    const updated = await repository.saveScene({
      id: first.id,
      title: "Renamed",
      workspaceDocument: { ...workspaceDocument, background: "room" },
    });

    expect(updated.id).toBe(first.id);
    expect(updated.createdAt).toBe(first.createdAt);
    expect(updated.title).toBe("Renamed");
    expect(updated.workspaceDocument.background).toBe("room");
    expect(await repository.listScenes()).toHaveLength(1);
  });
});
