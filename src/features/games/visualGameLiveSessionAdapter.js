import { z } from "zod";
import { createLiveSessionAdapter } from "../live-sessions/liveSessionAdapter";

const mark = z.object({ id: z.string().min(1), x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).strict();
export const visualGameSharedStateSchema = z.object({ version: z.literal(1), imageId: z.string().min(1), title: z.string().min(1), marks: z.array(mark).max(100) }).strict();
export const visualGameLiveSessionAdapter = createLiveSessionAdapter({
  activityKind: "visual-game",
  applyAction: (state, action) => action.type === "visual/mark" ? { ...state, marks: [...state.marks, action.mark] } : action.type === "visual/undo" ? { ...state, marks: state.marks.slice(0, -1) } : action.type === "visual/clear" ? { ...state, marks: [] } : action.state,
  createAction: (_previous, next) => ({ type: "visual/replace", state: next }),
  getInitialSharedState: (state) => visualGameSharedStateSchema.parse(state),
  isMeaningfulUseAction: (action) => action.type === "visual/mark",
  isRebasableAction: (_role, action) => action.type === "visual/mark",
  validateAction: (role, action, state) => {
    const result = z.discriminatedUnion("type", [z.object({ type: z.literal("visual/mark"), mark }).strict(), z.object({ type: z.literal("visual/undo") }).strict(), z.object({ type: z.literal("visual/clear") }).strict(), z.object({ type: z.literal("visual/replace"), state: visualGameSharedStateSchema }).strict()]).safeParse(action);
    if (!result.success || (result.data.type === "visual/replace" && role !== "host")) return result.success ? { success: false } : result;
    if (result.data.type === "visual/mark" && state.marks.some(({ id }) => id === result.data.mark.id)) return { success: false };
    return result;
  },
  validateSnapshot: (state) => visualGameSharedStateSchema.safeParse(state),
});
