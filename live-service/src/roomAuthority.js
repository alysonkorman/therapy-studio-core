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
  clock = () => new Date(),
  store,
  tokenIssuer,
}) {
  const now = () => clock().toISOString();
  const expiry = () => new Date(clock().getTime() + 90 * 60 * 1000).toISOString();
  const snapshot = (room) => ({
    type: "snapshot",
    version: LIVE_SESSION_PROTOCOL_VERSION,
    sessionId: room.id,
    activityKind: room.activityKind,
    status: room.status,
    revision: room.revision,
    state: room.state,
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
    async createRoom({ hostSubject, state }) {
      const validated = adapter.validateSnapshot(state);
      if (!validated.success) throw new Error("invalid");
      const capability = opaque();
      const room = {
        ...createLiveSession({
          id: opaque(18),
          activityKind: "whiteboard",
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
      const expiresAt = new Date(
        Math.min(new Date(room.expiresAt).getTime(), clock().getTime() + 5 * 60 * 1000)
      ).toISOString();
      return tokenIssuer({ expiresAt, role: "participant", sessionId });
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
        expiresAt: new Date(clock().getTime() + 5 * 60 * 1000).toISOString(),
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
      return { replaced, snapshot: snapshot(room) };
    },
    async action({ connectionId, message }) {
      const connection = await store.getConnection(connectionId);
      const room = connection && (await load(connection.roomId));
      if (!connection || !room || room.status === "ended" || room.status === "expired")
        throw new Error("forbidden");
      if (!hasSafeActionSize(message) || message.baseRevision !== room.revision)
        return { accepted: false, snapshot: snapshot(room), code: "stale" };
      const validated = adapter.validateAction(connection.role, message.action);
      if (!validated.success) throw new Error("invalid");
      room.state = adapter.applyAction(room.state, validated.data);
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
      await store.deleteConnection(connectionId);
    },
    log(event, details) {
      return sanitizeLiveLog(event, details);
    },
  };
}
