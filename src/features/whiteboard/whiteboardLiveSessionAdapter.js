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

export const whiteboardParticipantPresetSchema = z.enum(["young", "older"]);
export const whiteboardParticipantPermissionSchema = z.enum([
  "everything",
  "unlocked-items-only",
  "draw-only",
]);

const sessionSettingsSchema = z
  .object({
    participantPermission: whiteboardParticipantPermissionSchema.default("everything"),
    participantPreset: whiteboardParticipantPresetSchema.default("young"),
  })
  .strict();

export const whiteboardLiveSharedStateSchema = z
  .object({
    version: z.literal(1),
    objects: z.array(sharedObjectSchema),
    session: sessionSettingsSchema.default({
      participantPermission: "everything",
      participantPreset: "young",
    }),
  })
  .strict();

export const whiteboardLiveActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("whiteboard/add"), object: sharedObjectSchema }).strict(),
  z.object({ type: z.literal("whiteboard/update"), object: sharedObjectSchema }).strict(),
  z.object({ type: z.literal("whiteboard/delete"), id: z.string().min(1) }).strict(),
  z
    .object({
      type: z.literal("whiteboard/replace"),
      state: whiteboardLiveSharedStateSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("whiteboard/session-settings"),
      session: sessionSettingsSchema,
    })
    .strict(),
]);

export function projectWhiteboardForLiveSession(document, session = {}) {
  return whiteboardLiveSharedStateSchema.parse({
    version: 1,
    objects: document.objects.filter(({ kind }) => kind !== "image"),
    session,
  });
}

function sameObject(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function canParticipantChange(action, state) {
  const permission = state.session?.participantPermission ?? "everything";
  if (action.type === "whiteboard/add")
    return permission !== "draw-only" || action.object.kind === "stroke";
  if (permission === "draw-only") return false;
  const id = action.type === "whiteboard/delete" ? action.id : action.object.id;
  return Boolean(state.objects.find((object) => object.id === id && !object.locked));
}

export const whiteboardLiveSessionAdapter = createLiveSessionAdapter({
  activityKind: "whiteboard",
  applyAction(state, action) {
    if (action.type === "whiteboard/add")
      return { ...state, objects: [...state.objects, action.object] };
    if (action.type === "whiteboard/update")
      return {
        ...state,
        objects: state.objects.map((object) =>
          object.id === action.object.id ? action.object : object
        ),
      };
    if (action.type === "whiteboard/delete")
      return { ...state, objects: state.objects.filter(({ id }) => id !== action.id) };
    if (action.type === "whiteboard/session-settings")
      return { ...state, session: action.session };
    return action.state;
  },
  createAction(previous, next) {
    if (JSON.stringify(previous.session) !== JSON.stringify(next.session))
      return { type: "whiteboard/session-settings", session: next.session };
    const previousById = new Map(previous.objects.map((object) => [object.id, object]));
    const nextById = new Map(next.objects.map((object) => [object.id, object]));
    const added = next.objects.filter(({ id }) => !previousById.has(id));
    const removed = previous.objects.filter(({ id }) => !nextById.has(id));
    const changed = next.objects.filter(
      (object) =>
        previousById.has(object.id) && !sameObject(object, previousById.get(object.id))
    );
    if (added.length === 1 && !removed.length && !changed.length)
      return { type: "whiteboard/add", object: added[0] };
    if (changed.length === 1 && !added.length && !removed.length)
      return { type: "whiteboard/update", object: changed[0] };
    if (removed.length === 1 && !added.length && !changed.length)
      return { type: "whiteboard/delete", id: removed[0].id };
    return { type: "whiteboard/replace", state: next };
  },
  getInitialSharedState: projectWhiteboardForLiveSession,
  isMeaningfulUseAction(action) {
    return action.type === "whiteboard/add";
  },
  isRebasableAction(_role, action) {
    return action.type === "whiteboard/add";
  },
  validateAction(role, action, state) {
    if (!["host", "participant"].includes(role)) return { success: false };
    const parsed = whiteboardLiveActionSchema.safeParse(action);
    if (!parsed.success) return parsed;
    if (
      parsed.data.type === "whiteboard/add" &&
      state?.objects?.some(({ id }) => id === parsed.data.object.id)
    )
      return { success: false };
    if (role === "host") return parsed;
    if (
      parsed.data.type === "whiteboard/replace" ||
      parsed.data.type === "whiteboard/session-settings" ||
      !canParticipantChange(parsed.data, state)
    )
      return { success: false };
    return parsed;
  },
  validateSnapshot(state) {
    return whiteboardLiveSharedStateSchema.safeParse(state);
  },
});
