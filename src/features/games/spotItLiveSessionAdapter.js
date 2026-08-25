import { z } from "zod";

import { createLiveSessionAdapter } from "../live-sessions/liveSessionAdapter";

const cardSchema = z.array(z.string().min(1)).length(8);
export const spotItSharedStateSchema = z.object({
  version: z.literal(1),
  match: z.string().min(1),
  left: cardSchema,
  right: cardSchema,
  found: z.boolean(),
}).strict().superRefine((state, context) => {
  if (!state.left.includes(state.match) || !state.right.includes(state.match))
    context.addIssue({ code: "custom", message: "The matching symbol must be on both cards." });
});

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("spot-it/found") }).strict(),
  z.object({ type: z.literal("spot-it/replace"), state: spotItSharedStateSchema }).strict(),
]);

export const spotItLiveSessionAdapter = createLiveSessionAdapter({
  activityKind: "spot-it",
  applyAction: (state, action) => action.type === "spot-it/found" ? { ...state, found: true } : action.state,
  createAction: (previous, next) => !previous.found && next.found ? { type: "spot-it/found" } : { type: "spot-it/replace", state: next },
  getInitialSharedState: (state) => spotItSharedStateSchema.parse(state),
  isMeaningfulUseAction: (action) => action.type === "spot-it/found",
  isRebasableAction: (_role, action) => action.type === "spot-it/found",
  validateAction: (role, action) => {
    if (!['host', 'participant'].includes(role)) return { success: false };
    const parsed = actionSchema.safeParse(action);
    if (!parsed.success) return parsed;
    return parsed.data.type === "spot-it/replace" && role !== "host" ? { success: false } : parsed;
  },
  validateSnapshot: (state) => spotItSharedStateSchema.safeParse(state),
});
