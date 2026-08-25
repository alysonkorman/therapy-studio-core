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

  it("lets a participant undo only their most recent unchanged add", async () => {
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
    const host = await authority.hostCredential({
      hostSubject: "host-subject",
      sessionId: room.id,
    });
    await authority.connect({ connectionId: "host", credential: host });
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
      connectionId: "host",
      message: {
        baseRevision: 0,
        action: { type: "whiteboard/add", object: stroke("host") },
      },
    });
    const added = await authority.action({
      connectionId: "participant",
      message: {
        baseRevision: 1,
        action: { type: "whiteboard/add", object: stroke("participant") },
      },
    });
    expect(added.snapshot.state.session.participantUndoAvailable).toBe(true);

    const undone = await authority.action({
      connectionId: "participant",
      message: { baseRevision: 2, action: { type: "whiteboard/undo-participant" } },
    });
    expect(undone.accepted).toBe(true);
    expect(undone.room.state.objects.map(({ id }) => id)).toEqual(["host"]);
    expect(undone.snapshot.state.session.participantUndoAvailable).toBe(false);

    const empty = await authority.action({
      connectionId: "participant",
      message: { baseRevision: 3, action: { type: "whiteboard/undo-participant" } },
    });
    expect(empty).toEqual(
      expect.objectContaining({
        accepted: false,
        room: expect.any(Object),
        code: "empty",
      })
    );
  });

  it("uses an actor-aware host undo and preserves participant work", async () => {
    const authority = createRoomAuthority({
      adapter: whiteboardLiveSessionAdapter,
      store: memoryStore(),
      tokenIssuer: (x) => x,
    });
    const { room, capability } = await authority.createRoom({
      hostSubject: "host-subject",
      state: { version: 1, objects: [] },
    });
    const host = await authority.hostCredential({
      hostSubject: "host-subject",
      sessionId: room.id,
    });
    const participant = await authority.join({ sessionId: room.id, capability });
    await authority.connect({ connectionId: "host", credential: host });
    await authority.connect({ connectionId: "participant", credential: participant });
    const object = (id) => ({
      id,
      kind: "stroke",
      points: [
        { x: 1, y: 1 },
        { x: 20, y: 20 },
      ],
      color: "#112233",
      width: 4,
    });

    const hostAdd = await authority.action({
      connectionId: "host",
      message: {
        baseRevision: 0,
        action: { type: "whiteboard/add", object: object("host") },
      },
    });
    expect(hostAdd.snapshot.state.session.hostUndoAvailable).toBe(true);
    await authority.action({
      connectionId: "participant",
      message: {
        baseRevision: 1,
        action: { type: "whiteboard/add", object: object("child") },
      },
    });

    const undone = await authority.action({
      connectionId: "host",
      message: { baseRevision: 2, action: { type: "whiteboard/undo-host" } },
    });
    expect(undone.accepted).toBe(true);
    expect(undone.room.state.objects.map(({ id }) => id)).toEqual(["child"]);
  });

  it("erases unlocked stroke segments and lets the host clear the shared board", async () => {
    const authority = createRoomAuthority({
      adapter: whiteboardLiveSessionAdapter,
      store: memoryStore(),
      tokenIssuer: (x) => x,
    });
    const locked = {
      id: "locked",
      kind: "stroke",
      locked: true,
      points: [
        { x: 5, y: 5 },
        { x: 25, y: 5 },
      ],
      color: "#112233",
      width: 4,
    };
    const editable = {
      id: "editable",
      kind: "stroke",
      points: [
        { x: 10, y: 50 },
        { x: 50, y: 50 },
        { x: 90, y: 50 },
      ],
      color: "#112233",
      width: 4,
    };
    const { room } = await authority.createRoom({
      hostSubject: "host-subject",
      state: { version: 1, objects: [locked, editable] },
    });
    const host = await authority.hostCredential({
      hostSubject: "host-subject",
      sessionId: room.id,
    });
    await authority.connect({ connectionId: "host", credential: host });

    const erased = await authority.action({
      connectionId: "host",
      message: {
        baseRevision: 0,
        action: { type: "whiteboard/erase", points: [{ x: 50, y: 50 }], radius: 10 },
      },
    });
    expect(erased.room.state.objects).toHaveLength(3);
    const cleared = await authority.action({
      connectionId: "host",
      message: { baseRevision: 1, action: { type: "whiteboard/clear" } },
    });
    expect(cleared.room.state.objects).toEqual([]);
  });
});
