import { z } from "zod";

import { liveSessionRoleSchema } from "../../models/liveSession";

export const liveSessionActionEnvelopeSchema = z
  .object({
    sessionId: z.string().min(1),
    revision: z.number().int().nonnegative(),
    role: liveSessionRoleSchema,
    action: z.unknown(),
  })
  .strict();

// Activity adapters intentionally own their schemas. The shared controller only
// knows how to carry validated actions and snapshots between participants.
export function createLiveSessionAdapter({
  activityKind,
  applyAction,
  createAction,
  getInitialSharedState,
  isRebasableAction = () => false,
  isMeaningfulUseAction = () => false,
  validateAction,
  validateSnapshot,
}) {
  return Object.freeze({
    activityKind,
    applyAction,
    createAction,
    getInitialSharedState,
    isRebasableAction,
    isMeaningfulUseAction,
    validateAction,
    validateSnapshot,
  });
}
