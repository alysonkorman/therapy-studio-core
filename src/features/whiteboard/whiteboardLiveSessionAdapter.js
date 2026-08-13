import { z } from "zod";

import {
  whiteboardArrowSchema,
  whiteboardShapeSchema,
  whiteboardStrokeSchema,
  whiteboardTextSchema,
  whiteboardVisualSchema,
} from "../../models";
import { createLiveSessionAdapter } from "../live-sessions/liveSessionAdapter";

const sharedObjectSchema = z.discriminatedUnion("kind", [
  whiteboardStrokeSchema,
  whiteboardTextSchema,
  whiteboardVisualSchema,
  whiteboardShapeSchema,
  whiteboardArrowSchema,
]);

export const whiteboardLiveSharedStateSchema = z
  .object({ version: z.literal(1), objects: z.array(sharedObjectSchema) })
  .strict();

export const whiteboardLiveActionSchema = z
  .object({
    type: z.literal("whiteboard/replace"),
    state: whiteboardLiveSharedStateSchema,
  })
  .strict();

export function projectWhiteboardForLiveSession(document) {
  return whiteboardLiveSharedStateSchema.parse({
    version: 1,
    objects: document.objects.filter(({ kind }) => kind !== "image"),
  });
}

export const whiteboardLiveSessionAdapter = createLiveSessionAdapter({
  activityKind: "whiteboard",
  applyAction(_state, action) {
    return action.state;
  },
  createAction(state) {
    return { type: "whiteboard/replace", state };
  },
  getInitialSharedState: projectWhiteboardForLiveSession,
  isMeaningfulUseAction(action) {
    return action.type === "whiteboard/replace" && action.state.objects.length > 0;
  },
  validateAction(role, action) {
    if (!["host", "participant"].includes(role)) return { success: false };
    return whiteboardLiveActionSchema.safeParse(action);
  },
  validateSnapshot(state) {
    return whiteboardLiveSharedStateSchema.safeParse(state);
  },
});
