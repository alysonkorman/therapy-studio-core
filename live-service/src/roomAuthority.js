import { createHash, randomBytes } from "node:crypto";

import {
  hasSafeActionSize,
  LIVE_SESSION_PROTOCOL_VERSION,
  sanitizeLiveLog,
} from "../../src/features/live-sessions/liveSessionProtocol.js";
import { createLiveSession, liveSessionSchema } from "../../src/models/liveSession.js";

const capabilityHash = (capability) =>
  createHash("sha256").update(capability).digest("hex");
const opaque = (bytes = 32) => randomBytes(bytes).toString("base64url");

export function createRoomAuthority({
  adapter,
  adapters,
  clock = () => new Date(),
  store,
  tokenIssuer,
}) {
  const activityAdapters = adapters ?? { [adapter.activityKind]: adapter };
  const adapterFor = (activityKind) => activityAdapters[activityKind];
  const now = () => clock().toISOString();
  const expiry = () => new Date(clock().getTime() + 90 * 60 * 1000).toISOString();
  const sameObject = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  const patchFor = (before, after) => {
    const beforeById = new Map(before.objects.map((object) => [object.id, object]));
    const afterById = new Map(after.objects.map((object) => [object.id, object]));
    const previous = before.objects.filter(
      (object) =>
        !afterById.has(object.id) || !sameObject(object, afterById.get(object.id))
    );
    const next = after.objects.filter(
      (object) =>
        !beforeById.has(object.id) || !sameObject(object, beforeById.get(object.id))
    );
    return previous.length || next.length ? { after: next, before: previous } : null;
  };
  const canUndoPatch = (room, patch) => {
    const currentById = new Map(room.state.objects.map((object) => [object.id, object]));
    const afterIds = new Set(patch.after.map(({ id }) => id));
    return (
      patch.after.every((object) => sameObject(currentById.get(object.id), object)) &&
      patch.before
        .filter(({ id }) => !afterIds.has(id))
        .every(({ id }) => !currentById.has(id))
    );
  };
  const nextHostUndoPatch = (room) =>
    [...(room.hostUndo ?? [])].reverse().find((patch) => canUndoPatch(room, patch)) ??
    null;
  const takeHostUndoPatch = (room) => {
    while (room.hostUndo?.length) {
      const patch = room.hostUndo.pop();
      if (canUndoPatch(room, patch)) return patch;
    }
    return null;
  };
  const undoPatch = (state, patch) => {
    const afterIds = new Set(patch.after.map(({ id }) => id));
    return {
      ...state,
      objects: [...state.objects.filter(({ id }) => !afterIds.has(id)), ...patch.before],
    };
  };
  const participantUndoObject = (room) =>
    room.participantUndo &&
    room.state.objects.find(
      (object) =>
        object.id === room.participantUndo.id &&
        !object.locked &&
        JSON.stringify(object) === JSON.stringify(room.participantUndo.object)
    );
  const snapshot = (room) => ({
    type: "snapshot",
    version: LIVE_SESSION_PROTOCOL_VERSION,
    sessionId: room.id,
    activityKind: room.activityKind,
    status: room.status,
    revision: room.revision,
    state:
      room.activityKind === "whiteboard"
        ? {
            ...room.state,
            session: {
              ...room.state.session,
              hostUndoAvailable: Boolean(nextHostUndoPatch(room)),
              participantUndoAvailable: Boolean(participantUndoObject(room)),
            },
          }
        : room.state,
    presence: {
      host: Boolean(room.hostConnectionId),
      participant: Boolean(room.participantConnectionId),
    },
  });
  const expired = (room) => new Date(room.expiresAt).getTime() <= clock().getTime();
  const load = async (id) => {
    const room = await store.getRoom(id);
    if (!room) return null;
    if (expired(room) && room.status !== "ended") {
      room.status = "expired";
      await store.putRoom(room);
    }
    return room;
  };
  return {
    async createRoom({ activityKind = "whiteboard", hostSubject, state }) {
      const activityAdapter = adapterFor(activityKind);
      if (!activityAdapter) throw new Error("invalid");
      const validated = activityAdapter.validateSnapshot(state);
      if (!validated.success) throw new Error("invalid");
      const capability = opaque();
      const room = {
        ...createLiveSession({
          id: opaque(18),
          activityKind,
          expiresAt: expiry(),
          now: now(),
        }),
        state: validated.data,
        hostSubject,
        participantCapabilityHash: capabilityHash(capability),
        ttl: Math.floor(new Date(expiry()).getTime() / 1000),
      };
      await store.putRoom(room);
      const publicRoom = liveSessionSchema.parse({
        id: room.id,
        version: room.version,
        activityKind: room.activityKind,
        status: room.status,
        revision: room.revision,
        createdAt: room.createdAt,
        expiresAt: room.expiresAt,
      });
      return { room: publicRoom, capability, snapshot: snapshot(room) };
    },
    async join({ capability, sessionId }) {
      const room = await load(sessionId);
      if (
        !room ||
        room.status === "ended" ||
        room.status === "expired" ||
        capabilityHash(capability) !== room.participantCapabilityHash
      )
        throw new Error("forbidden");
      const expiresAt = room.expiresAt;
      return {
        ...tokenIssuer({ expiresAt, role: "participant", sessionId }),
        activityKind: room.activityKind,
      };
    },
    async hostCredential({ hostSubject, sessionId }) {
      const room = await load(sessionId);
      if (
        !room ||
        room.hostSubject !== hostSubject ||
        room.status === "ended" ||
        room.status === "expired"
      )
        throw new Error("forbidden");
      return tokenIssuer({
        expiresAt: room.expiresAt,
        role: "host",
        sessionId,
      });
    },
    async connect({ connectionId, credential }) {
      const room = await load(credential.sessionId);
      if (!room || room.status === "ended" || room.status === "expired")
        throw new Error("expired");
      const key =
        credential.role === "host" ? "hostConnectionId" : "participantConnectionId";
      const replaced = room[key];
      room[key] = connectionId;
      room.status =
        room.hostConnectionId && room.participantConnectionId ? "active" : "waiting";
      await store.putRoom(room);
      await store.putConnection({
        connectionId,
        roomId: room.id,
        role: credential.role,
        ttl: room.ttl,
      });
      return { replaced, room, snapshot: snapshot(room) };
    },
    async action({ connectionId, message }) {
      const connection = await store.getConnection(connectionId);
      const room = connection && (await load(connection.roomId));
      if (!connection || !room || room.status === "ended" || room.status === "expired")
        throw new Error("forbidden");
      const activityAdapter = adapterFor(room.activityKind);
      if (!activityAdapter) throw new Error("invalid");
      if (!hasSafeActionSize(message))
        return { accepted: false, room, snapshot: snapshot(room), code: "stale" };
      if (
        message.baseRevision !== room.revision &&
        !activityAdapter.isRebasableAction?.(connection.role, message.action, room.state)
      )
        return { accepted: false, room, snapshot: snapshot(room), code: "stale" };
      const validated = activityAdapter.validateAction(
        connection.role,
        message.action,
        room.state
      );
      if (!validated.success) throw new Error("invalid");
      if (room.activityKind === "whiteboard" && validated.data.type === "whiteboard/undo-participant") {
        const object = participantUndoObject(room);
        if (!object)
          return { accepted: false, room, snapshot: snapshot(room), code: "empty" };
        room.state = activityAdapter.applyAction(room.state, {
          type: "whiteboard/delete",
          id: object.id,
        });
        room.participantUndo = undefined;
        room.revision += 1;
        await store.putRoom(room);
        return { accepted: true, room, snapshot: snapshot(room) };
      }
      if (room.activityKind === "whiteboard" && validated.data.type === "whiteboard/undo-host") {
        const patch = takeHostUndoPatch(room);
        if (!patch)
          return { accepted: false, room, snapshot: snapshot(room), code: "empty" };
        room.state = undoPatch(room.state, patch);
        room.revision += 1;
        await store.putRoom(room);
        return { accepted: true, room, snapshot: snapshot(room) };
      }
      const before = room.state;
      room.state = activityAdapter.applyAction(before, validated.data);
      if (room.activityKind === "whiteboard" && connection.role === "host") {
        const patch = patchFor(before, room.state);
        if (patch) room.hostUndo = [...(room.hostUndo ?? []), patch].slice(-40);
      }
      if (room.activityKind === "whiteboard" && connection.role === "participant" && validated.data.type === "whiteboard/add")
        room.participantUndo = {
          id: validated.data.object.id,
          object: validated.data.object,
        };
      else if (
        room.activityKind === "whiteboard" && room.participantUndo &&
        (validated.data.type === "whiteboard/delete" ||
          validated.data.type === "whiteboard/update") &&
        (validated.data.id === room.participantUndo.id ||
          validated.data.object?.id === room.participantUndo.id)
      )
        room.participantUndo = undefined;
      room.revision += 1;
      await store.putRoom(room);
      return { accepted: true, room, snapshot: snapshot(room) };
    },
    async end({ connectionId }) {
      const connection = await store.getConnection(connectionId);
      const room = connection && (await load(connection.roomId));
      if (!room || connection.role !== "host") throw new Error("forbidden");
      room.status = "ended";
      await store.putRoom(room);
      return { room, message: { type: "ended", version: LIVE_SESSION_PROTOCOL_VERSION } };
    },
    async endByHost({ hostSubject, sessionId }) {
      const room = await load(sessionId);
      if (!room || room.hostSubject !== hostSubject) throw new Error("forbidden");
      room.status = "ended";
      await store.putRoom(room);
      return { room, message: { type: "ended", version: LIVE_SESSION_PROTOCOL_VERSION } };
    },
    async disconnect(connectionId) {
      const connection = await store.getConnection(connectionId);
      const room = connection && (await load(connection.roomId));
      await store.deleteConnection(connectionId);
      if (!room) return null;
      if (connection.role === "host" && room.hostConnectionId === connectionId)
        room.hostConnectionId = undefined;
      if (
        connection.role === "participant" &&
        room.participantConnectionId === connectionId
      )
        room.participantConnectionId = undefined;
      if (room.status !== "ended") room.status = "waiting";
      await store.putRoom(room);
      return { room, snapshot: snapshot(room) };
    },
    log(event, details) {
      return sanitizeLiveLog(event, details);
    },
  };
}
