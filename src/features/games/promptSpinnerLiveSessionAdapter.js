import { z } from "zod";

import { createLiveSessionAdapter } from "../live-sessions/liveSessionAdapter";

const promptSchema = z.object({ id: z.string().min(1), text: z.string().min(1), deckTitle: z.string().min(1) }).strict();
export const promptSpinnerSharedStateSchema = z.object({
  version: z.literal(1),
  title: z.string().min(1),
  theme: z.enum(["town", "space", "farm", "tropical"]),
  deckTitles: z.array(z.string().min(1)).min(1),
  prompts: z.array(promptSchema).min(1).max(120),
  position: z.number().int().min(0).max(23),
  lastSpin: z.number().int().min(1).max(6).nullable(),
  currentPrompt: promptSchema.nullable(),
}).strict();

export const promptSpinnerLiveSessionAdapter = createLiveSessionAdapter({
  activityKind: "prompt-spinner",
  applyAction: (state, action) => action.type === "spinner/spin" ? { ...state, position: (state.position + action.steps) % 24, lastSpin: action.steps, currentPrompt: state.prompts[action.promptIndex] } : action.state,
  createAction: (_previous, next) => ({ type: "spinner/replace", state: next }),
  getInitialSharedState: (state) => promptSpinnerSharedStateSchema.parse(state),
  isMeaningfulUseAction: (action) => action.type === "spinner/spin",
  isRebasableAction: (_role, action) => action.type === "spinner/spin",
  validateAction: (role, action, state) => {
    const parsed = z.discriminatedUnion("type", [
      z.object({ type: z.literal("spinner/spin"), steps: z.number().int().min(1).max(6), promptIndex: z.number().int().min(0) }).strict(),
      z.object({ type: z.literal("spinner/replace"), state: promptSpinnerSharedStateSchema }).strict(),
    ]).safeParse(action);
    if (!parsed.success) return parsed;
    if (parsed.data.type === "spinner/replace" && role !== "host") return { success: false };
    if (parsed.data.type === "spinner/spin" && parsed.data.promptIndex >= state.prompts.length) return { success: false };
    return parsed;
  },
  validateSnapshot: (state) => promptSpinnerSharedStateSchema.safeParse(state),
});
