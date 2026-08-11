import { afterEach, describe, expect, it } from "vitest";

import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import { createTherapyStudioDatabase } from "./database";
import { createWhiteboardRepository } from "./whiteboardRepository";

const databases = [];

function setup() {
  const database = createTherapyStudioDatabase({
    name: `whiteboard-test-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  });
  databases.push(database);
  return createWhiteboardRepository({
    database,
    createId: () => "board-1",
    now: () => "2026-08-11T12:00:00.000Z",
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

describe("Whiteboard repository", () => {
  it("creates, saves, lists, and reopens a Whiteboard", async () => {
    const repository = setup();
    const created = await repository.createWhiteboard("Session Board");
    const saved = await repository.saveWhiteboard({
      ...created,
      objects: [
        {
          id: "text",
          kind: "text",
          text: "Welcome",
          x: 10,
          y: 20,
          color: "#112233",
          size: 24,
        },
        {
          id: "rectangle",
          kind: "rectangle",
          x: 40,
          y: 60,
          width: 180,
          height: 90,
          strokeColor: "#67529D",
          fillColor: "#E4B83F",
          strokeWidth: 4,
        },
        {
          id: "arrow",
          kind: "arrow",
          x1: 20,
          y1: 30,
          x2: 200,
          y2: 160,
          strokeColor: "#B14C4C",
          strokeWidth: 5,
        },
      ],
    });
    expect((await repository.getWhiteboard(created.id)).objects).toEqual(saved.objects);
    expect((await repository.listWhiteboards())[0].title).toBe("Session Board");
  });

  it("rejects malformed documents before writing", async () => {
    const repository = setup();
    const created = await repository.createWhiteboard();
    await expect(
      repository.saveWhiteboard({ ...created, therapistPrivateNotes: "No" })
    ).rejects.toThrow();
  });
});
