import { z } from "zod";

import { createLiveSessionAdapter } from "../live-sessions/liveSessionAdapter";

const cellSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  iconId: z.string().nullable().optional(),
  free: z.boolean().optional(),
}).strict();

const boardSchema = z.object({
  size: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  hasFreeSpace: z.boolean(),
  cells: z.array(cellSchema).max(25),
}).strict();

export const bingoLiveSharedStateSchema = z.object({
  version: z.literal(1),
  title: z.string().max(160),
  board: boardSchema.nullable(),
  marked: z.array(z.string()).max(25),
}).strict().superRefine((state, context) => {
  const cellIds = new Set(state.board?.cells.map(({ id }) => id) ?? []);
  if (state.marked.some((id) => !cellIds.has(id)))
    context.addIssue({ code: "custom", message: "Marked Bingo cells must exist on the board." });
});

export const bingoLiveActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bingo/toggle"), cellId: z.string().min(1) }).strict(),
  z.object({ type: z.literal("bingo/replace"), state: bingoLiveSharedStateSchema }).strict(),
]);

function toggled(state, cellId) {
  const marked = new Set(state.marked);
  if (marked.has(cellId)) marked.delete(cellId);
  else marked.add(cellId);
  return { ...state, marked: [...marked] };
}

export const bingoLiveSessionAdapter = createLiveSessionAdapter({
  activityKind: "bingo",
  applyAction(state, action) {
    return action.type === "bingo/toggle" ? toggled(state, action.cellId) : action.state;
  },
  createAction(previous, next) {
    if (previous.board && next.board && JSON.stringify(previous.board) === JSON.stringify(next.board)) {
      const changed = [...new Set([...previous.marked, ...next.marked])].filter(
        (id) => previous.marked.includes(id) !== next.marked.includes(id)
      );
      if (changed.length === 1) return { type: "bingo/toggle", cellId: changed[0] };
    }
    return { type: "bingo/replace", state: next };
  },
  getInitialSharedState: (state) => bingoLiveSharedStateSchema.parse(state),
  isMeaningfulUseAction: (action) => action.type === "bingo/toggle",
  isRebasableAction: (_role, action) => action.type === "bingo/toggle",
  validateAction(role, action, state) {
    if (!["host", "participant"].includes(role)) return { success: false };
    const parsed = bingoLiveActionSchema.safeParse(action);
    if (!parsed.success) return parsed;
    if (parsed.data.type === "bingo/replace")
      return role === "host" ? parsed : { success: false };
    const cell = state.board?.cells.find(({ id }) => id === parsed.data.cellId);
    return cell && !cell.free ? parsed : { success: false };
  },
  validateSnapshot: (state) => bingoLiveSharedStateSchema.safeParse(state),
});
