import { z } from "zod";

import {
  liveSessionActivityKindSchema,
  liveSessionRoleSchema,
  liveSessionStatusSchema,
} from "../../models/liveSession";

// This is deliberately transport-neutral. Both the browser transport and the AWS
// room authority use these envelopes; no client-provided role is authoritative.
export const LIVE_SESSION_PROTOCOL_VERSION = 1;
export const MAX_LIVE_ACTION_BYTES = 48 * 1024;

export const liveSessionActionSchema = z
  .object({
    baseRevision: z.number().int().nonnegative(),
    action: z.unknown(),
  })
  .strict();

export const liveSessionSnapshotSchema = z
  .object({
    type: z.literal("snapshot"),
    version: z.literal(LIVE_SESSION_PROTOCOL_VERSION),
    sessionId: z.string().min(16).max(128),
    status: liveSessionStatusSchema,
    revision: z.number().int().nonnegative(),
    activityKind: liveSessionActivityKindSchema,
    state: z.unknown(),
    presence: z.object({ host: z.boolean(), participant: z.boolean() }).strict(),
  })
  .strict();

export const liveSessionServerMessageSchema = z.discriminatedUnion("type", [
  liveSessionSnapshotSchema,
  z
    .object({
      type: z.literal("presence"),
      version: z.literal(LIVE_SESSION_PROTOCOL_VERSION),
      presence: z.object({ host: z.boolean(), participant: z.boolean() }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("ended"),
      version: z.literal(LIVE_SESSION_PROTOCOL_VERSION),
    })
    .strict(),
  z
    .object({
      type: z.literal("error"),
      version: z.literal(LIVE_SESSION_PROTOCOL_VERSION),
      code: z.enum(["invalid", "expired", "forbidden", "stale", "unavailable"]),
    })
    .strict(),
]);

export const roomCredentialSchema = z
  .object({
    token: z.string().min(32),
    expiresAt: z.string().datetime({ offset: true }),
    role: liveSessionRoleSchema,
    sessionId: z.string().min(16),
  })
  .strict();

export function hasSafeActionSize(value) {
  try {
    return (
      new TextEncoder().encode(JSON.stringify(value)).byteLength <= MAX_LIVE_ACTION_BYTES
    );
  } catch {
    return false;
  }
}

export function sanitizeLiveLog(event, details = {}) {
  // Never accept payload, token, capability, resource ID, or content fields here.
  return {
    event: String(event)
      .replace(/[^a-z0-9:_-]/gi, "")
      .slice(0, 64),
    status: ["waiting", "active", "ended", "expired"].includes(details.status)
      ? details.status
      : undefined,
    outcome: ["accepted", "rejected", "connected", "disconnected"].includes(
      details.outcome
    )
      ? details.outcome
      : undefined,
  };
}
