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

  it("merges simultaneous drawing additions without overwriting either stroke", async () => {
    const authority = createRoomAuthority({
      adapter: whiteboardLiveSessionAdapter,
      store: memoryStore(),
      tokenIssuer: (x) => x,
    });
    const { room, capability } = await authority.createRoom({
      hostSubject: "host-subject",
      state: { version: 1, objects: [] },
    });
    const participant = await authority.join({ sessionId: room.id, capability });
    await authority.connect({ connectionId: "participant", credential: participant });
    const stroke = (id) => ({
      id,
      kind: "stroke",
      points: [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
      color: "#112233",
      width: 4,
    });

    await authority.action({
      connectionId: "participant",
      message: {
        baseRevision: 0,
        action: { type: "whiteboard/add", object: stroke("one") },
      },
    });
    const rebased = await authority.action({
      connectionId: "participant",
      message: {
        baseRevision: 0,
        action: { type: "whiteboard/add", object: stroke("two") },
      },
    });
    expect(rebased.accepted).toBe(true);
    expect(rebased.room.state.objects.map(({ id }) => id)).toEqual(["one", "two"]);

    await expect(
      authority.action({
        connectionId: "participant",
        message: {
          baseRevision: 2,
          action: { type: "whiteboard/add", object: stroke("two") },
        },
      })
    ).rejects.toThrow("invalid");

    await expect(
      authority.action({
        connectionId: "participant",
        message: { baseRevision: 2, action: { type: "whiteboard/delete", id: "one" } },
      })
    ).resolves.toEqual(expect.objectContaining({ accepted: true }));
  });

  it("returns presence changes when a participant disconnects", async () => {
    const authority = createRoomAuthority({
      adapter: whiteboardLiveSessionAdapter,
      store: memoryStore(),
      tokenIssuer: (x) => x,
    });
    const { room, capability } = await authority.createRoom({
      hostSubject: "host-subject",
      state: { version: 1, objects: [] },
    });
    const participant = await authority.join({ sessionId: room.id, capability });
    const connected = await authority.connect({
      connectionId: "participant",
      credential: participant,
    });
    expect(connected.room.id).toBe(room.id);
    expect(connected.snapshot.presence.participant).toBe(true);

    const disconnected = await authority.disconnect("participant");
    expect(disconnected.snapshot.presence.participant).toBe(false);
    expect(disconnected.snapshot.status).toBe("waiting");
  });
});
