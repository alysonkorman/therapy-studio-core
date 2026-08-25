import { z } from "zod";

const isoTimestamp = z.string().datetime({ offset: true });

export const liveSessionActivityKindSchema = z.enum(["whiteboard", "bingo", "prompt-spinner", "visual-game", "spot-it"]);
export const liveSessionRoleSchema = z.enum(["host", "participant"]);
export const liveSessionStatusSchema = z.enum(["waiting", "active", "ended", "expired"]);

// Deliberately metadata-only. Credentials and every piece of therapist-private
// activity data stay outside this durable domain shape.
export const liveSessionSchema = z
  .object({
    id: z.string().trim().min(1),
    version: z.literal(1),
    activityKind: liveSessionActivityKindSchema,
    status: liveSessionStatusSchema,
    revision: z.number().int().nonnegative(),
    createdAt: isoTimestamp,
    expiresAt: isoTimestamp,
  })
  .strict();

export function createLiveSession({
  activityKind,
  expiresAt,
  id,
  now = new Date().toISOString(),
}) {
  return liveSessionSchema.parse({
    id,
    version: 1,
    activityKind,
    status: "waiting",
    revision: 0,
    createdAt: now,
    expiresAt,
  });
}
