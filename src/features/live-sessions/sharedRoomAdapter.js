import { z } from "zod";

import { createLiveSessionAdapter } from "./liveSessionAdapter";
import { spotItLiveSessionAdapter } from "../games/spotItLiveSessionAdapter";
import { memoryLiveSessionAdapter } from "../games/memoryLiveSessionAdapter";
import { whiteboardLiveSessionAdapter } from "../whiteboard/whiteboardLiveSessionAdapter";

export const sharedPermissionSchema = z.enum(["watch", "participate", "create"]);
export const sharedRoomStateSchema = z
  .object({
    activityKind: z.string().nullable(),
    activityStates: z.record(z.string(), z.unknown()),
    permission: sharedPermissionSchema,
    view: z.enum(["waiting", "activity"]),
  })
  .strict();

export const initialSharedRoomState = Object.freeze({
  activityKind: null,
  activityStates: {},
  permission: "participate",
  view: "waiting",
});

export const sharedRoomAdapter = createLiveSessionAdapter({
  activityKind: "shared-room",
  getInitialSharedState: () => structuredClone(initialSharedRoomState),
  validateSnapshot: (state) => sharedRoomStateSchema.safeParse(state),
  createAction: (_previous, next) => ({ type: "room/replace", state: next }),
  validateAction(role, action, state) {
    if (action?.type === "room/spot-it-action") {
      if (
        state.activityKind !== "spot-it" ||
        (state.permission === "watch" && role === "participant")
      )
        return { success: false };
      const parsed = spotItLiveSessionAdapter.validateAction(
        role,
        action.action,
        state.activityStates["spot-it"]
      );
      return parsed.success
        ? { success: true, data: { ...action, action: parsed.data } }
        : { success: false };
    }
    if (action?.type === "room/memory-action") {
      if (
        state.activityKind !== "memory" ||
        (state.permission === "watch" && role === "participant")
      )
        return { success: false };
      const parsed = memoryLiveSessionAdapter.validateAction(
        role,
        action.action,
        state.activityStates.memory
      );
      return parsed.success
        ? { success: true, data: { ...action, action: parsed.data } }
        : { success: false };
    }
    if (action?.type === "room/whiteboard-action") {
      if (
        state.activityKind !== "whiteboard" ||
        (state.permission === "watch" && role === "participant")
      )
        return { success: false };
      const parsed = whiteboardLiveSessionAdapter.validateAction(
        role,
        action.action,
        state.activityStates.whiteboard
      );
      return parsed.success
        ? { success: true, data: { ...action, action: parsed.data } }
        : { success: false };
    }
    if (role !== "host") return { success: false };
    const parsed = z
      .discriminatedUnion("type", [
        z
          .object({ type: z.literal("room/replace"), state: sharedRoomStateSchema })
          .strict(),
        z
          .object({ type: z.literal("room/spot-it-action"), action: z.unknown() })
          .strict(),
        z.object({ type: z.literal("room/memory-action"), action: z.unknown() }).strict(),
        z
          .object({ type: z.literal("room/whiteboard-action"), action: z.unknown() })
          .strict(),
        z.object({ type: z.literal("room/wait") }).strict(),
        z
          .object({
            type: z.literal("room/permission"),
            permission: sharedPermissionSchema,
          })
          .strict(),
        z
          .object({
            type: z.literal("room/select-activity"),
            activityKind: z.string().min(1),
            state: z.unknown().optional(),
          })
          .strict(),
        z
          .object({
            type: z.literal("room/save-activity"),
            activityKind: z.string().min(1),
            state: z.unknown(),
          })
          .strict(),
      ])
      .safeParse(action);
    return parsed;
  },
  applyAction(state, action) {
    if (action.type === "room/spot-it-action")
      return {
        ...state,
        activityStates: {
          ...state.activityStates,
          "spot-it": spotItLiveSessionAdapter.applyAction(
            state.activityStates["spot-it"],
            action.action
          ),
        },
      };
    if (action.type === "room/memory-action")
      return {
        ...state,
        activityStates: {
          ...state.activityStates,
          memory: memoryLiveSessionAdapter.applyAction(
            state.activityStates.memory,
            action.action
          ),
        },
      };
    if (action.type === "room/whiteboard-action")
      return {
        ...state,
        activityStates: {
          ...state.activityStates,
          whiteboard: whiteboardLiveSessionAdapter.applyAction(
            state.activityStates.whiteboard,
            action.action
          ),
        },
      };
    if (action.type === "room/wait")
      return { ...state, activityKind: null, view: "waiting" };
    if (action.type === "room/permission")
      return { ...state, permission: action.permission };
    if (action.type === "room/save-activity")
      return {
        ...state,
        activityStates: { ...state.activityStates, [action.activityKind]: action.state },
      };
    if (action.type === "room/replace") return action.state;
    return {
      ...state,
      activityKind: action.activityKind,
      activityStates:
        action.state === undefined
          ? state.activityStates
          : { ...state.activityStates, [action.activityKind]: action.state },
      view: "activity",
    };
  },
});
