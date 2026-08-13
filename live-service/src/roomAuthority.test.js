import { describe, expect, it } from "vitest";
import { whiteboardLiveSessionAdapter } from "../../src/features/whiteboard/whiteboardLiveSessionAdapter";
import { createRoomAuthority } from "./roomAuthority";

function memoryStore() {
  const rooms = new Map(),
    connections = new Map();
  return {
    getRoom: (id) => rooms.get(id),
    putRoom: (r) => rooms.set(r.id, structuredClone(r)),
    getConnection: (id) => connections.get(id),
    putConnection: (c) => connections.set(c.connectionId, c),
    deleteConnection: (id) => connections.delete(id),
  };
}
describe("AWS room authority", () => {
  it("keeps capabilities hashed, rejects escalation and serializes revisions", async () => {
    const authority = createRoomAuthority({
      adapter: whiteboardLiveSessionAdapter,
      store: memoryStore(),
      tokenIssuer: (x) => x,
    });
    const { room, capability } = await authority.createRoom({
      hostSubject: "host-subject",
      state: { version: 1, objects: [] },
    });
    expect(room.participantCapabilityHash).toBeUndefined();
    await expect(
      authority.createRoom({
        activityKind: "scene-builder",
        hostSubject: "host-subject",
        state: { version: 1, objects: [] },
      })
    ).rejects.toThrow("invalid");
    await expect(
      authority.join({ sessionId: room.id, capability: "wrong" })
    ).rejects.toThrow("forbidden");
    const participant = await authority.join({ sessionId: room.id, capability });
    expect(participant.activityKind).toBe("whiteboard");
    await authority.connect({ connectionId: "participant", credential: participant });
    const stale = await authority.action({
      connectionId: "participant",
      message: {
        baseRevision: 1,
        action: { type: "whiteboard/replace", state: { version: 1, objects: [] } },
      },
    });
    expect(stale.code).toBe("stale");
    await expect(authority.end({ connectionId: "participant" })).rejects.toThrow(
      "forbidden"
    );
  });
});
