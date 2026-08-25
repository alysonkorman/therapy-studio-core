import { describe, expect, it } from "vitest";

import { bingoLiveSessionAdapter } from "../../src/features/games/bingoLiveSessionAdapter";
import { whiteboardLiveSessionAdapter } from "../../src/features/whiteboard/whiteboardLiveSessionAdapter";
import { createRoomAuthority } from "./roomAuthority";

function memoryStore() {
  const rooms = new Map();
  const connections = new Map();
  return {
    getRoom: (id) => rooms.get(id),
    putRoom: (room) => rooms.set(room.id, structuredClone(room)),
    getConnection: (id) => connections.get(id),
    putConnection: (connection) => connections.set(connection.connectionId, connection),
    deleteConnection: (id) => connections.delete(id),
  };
}

const state = {
  version: 1,
  title: "Feelings Bingo",
  board: { size: 3, hasFreeSpace: false, cells: [{ id: "calm", text: "Calm" }] },
  marked: [],
};

describe("Bingo room authority", () => {
  it("creates an activity-bound room and synchronizes participant marks", async () => {
    const authority = createRoomAuthority({
      adapters: { bingo: bingoLiveSessionAdapter, whiteboard: whiteboardLiveSessionAdapter },
      store: memoryStore(),
      tokenIssuer: (credential) => credential,
    });
    const { room, capability } = await authority.createRoom({
      activityKind: "bingo",
      hostSubject: "therapist",
      state,
    });
    const participant = await authority.join({ capability, sessionId: room.id });
    expect(participant.expiresAt).toBe(room.expiresAt);
    expect(participant.activityKind).toBe("bingo");
    await authority.connect({ connectionId: "child", credential: participant });

    const result = await authority.action({
      connectionId: "child",
      message: { baseRevision: 0, action: { type: "bingo/toggle", cellId: "calm" } },
    });
    expect(result.room.state.marked).toEqual(["calm"]);
    expect(result.snapshot.activityKind).toBe("bingo");
  });

  it("prevents a participant from replacing the board", async () => {
    const authority = createRoomAuthority({
      adapters: { bingo: bingoLiveSessionAdapter },
      store: memoryStore(),
      tokenIssuer: (credential) => credential,
    });
    const { room, capability } = await authority.createRoom({ activityKind: "bingo", hostSubject: "therapist", state });
    const participant = await authority.join({ capability, sessionId: room.id });
    await authority.connect({ connectionId: "child", credential: participant });
    await expect(authority.action({ connectionId: "child", message: { baseRevision: 0, action: { type: "bingo/replace", state } } })).rejects.toThrow("invalid");
  });
});
