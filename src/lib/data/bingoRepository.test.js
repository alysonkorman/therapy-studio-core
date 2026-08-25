import { describe, expect, it, vi } from "vitest";

import { pictureWordBingo } from "../../data/resources";
import { createBingoRepository } from "./bingoRepository";

describe("Bingo repository", () => {
  it("returns starter and persisted Bingo without parsing Trivia as Bingo", async () => {
    const persisted = { ...pictureWordBingo, id: "saved-bingo", archived: false };
    const repository = createBingoRepository({
      resources: {
        getAllResources: vi.fn(async () => [
          persisted,
          { id: "trivia", type: "game", gameKind: "trivia", archived: false },
        ]),
        getResourceById: vi.fn(async () => persisted),
      },
    });
    const sets = await repository.getAllBingoSets();
    expect(sets.map(({ id }) => id)).toEqual(
      expect.arrayContaining([pictureWordBingo.id, "saved-bingo"])
    );
    expect(await repository.getBingoSetById("saved-bingo")).toMatchObject({
      id: "saved-bingo",
      starter: false,
    });
  });

  it("rejects persisted resources of the wrong game kind", async () => {
    const repository = createBingoRepository({
      resources: {
        getAllResources: vi.fn(async () => []),
        getResourceById: vi.fn(async () => ({
          id: "trivia",
          type: "game",
          gameKind: "trivia",
          archived: false,
        })),
      },
    });
    await expect(repository.getBingoSetById("trivia")).rejects.toThrow(/not found/i);
  });

  it("creates, updates, duplicates, and deletes therapist Bingo Sets", async () => {
    let stored;
    const resources = {
      createResourceRecord: vi.fn(async (value) => {
        stored = { ...value, archived: false };
        return stored;
      }),
      deleteResourcePermanently: vi.fn(async () => {}),
      getAllResources: vi.fn(async () => []),
      getResourceById: vi.fn(async () => stored),
      updateResourceRecord: vi.fn(async (_id, changes) => {
        stored = { ...stored, ...changes };
        return stored;
      }),
    };
    let id = 0;
    const repository = createBingoRepository({
      resources,
      createId: () => `created-${++id}`,
      now: () => "2026-08-25T12:00:00.000Z",
    });

    const created = await repository.createBingoSet({ title: "Feelings Bingo" });
    expect(created).toMatchObject({ gameKind: "bingo", boardSize: 3 });
    await expect(repository.updateBingoSet(created.id, { boardSize: 4 })).resolves.toMatchObject({ boardSize: 4 });
    await expect(repository.duplicateBingoSet(created.id)).resolves.toMatchObject({ title: "Feelings Bingo Copy" });
    await repository.deleteBingoSet(stored.id);
    expect(resources.deleteResourcePermanently).toHaveBeenCalled();
  });
});
