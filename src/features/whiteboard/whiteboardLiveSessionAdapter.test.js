import { describe, expect, it } from "vitest";

import { createBlankWhiteboardDocument } from "../../models";
import {
  projectWhiteboardForLiveSession,
  whiteboardLiveSessionAdapter,
} from "./whiteboardLiveSessionAdapter";

const now = "2026-08-13T12:00:00.000Z";

function board(objects) {
  return { ...createBlankWhiteboardDocument({ id: "board", now }), objects };
}

describe("Whiteboard Live Session adapter", () => {
  it("projects only schema-validated shared objects and excludes local media", () => {
    const state = projectWhiteboardForLiveSession(
      board([
        {
          id: "draw",
          kind: "stroke",
          points: [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
          ],
          color: "#112233",
          width: 4,
        },
        {
          id: "local-image",
          kind: "image",
          assetId: "local-only",
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        },
      ])
    );

    expect(state).toEqual({
      version: 1,
      objects: [expect.objectContaining({ id: "draw" })],
      session: {
        participantPermission: "everything",
        participantPreset: "young",
      },
    });
    expect(JSON.stringify(state)).not.toContain("local-only");
  });

  it("enforces participant editing permissions in the shared action layer", () => {
    const state = { version: 1, objects: [], session: {} };
    const action = {
      type: "whiteboard/add",
      object: {
        id: "stroke",
        kind: "stroke",
        points: [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
        ],
        color: "#112233",
        width: 4,
      },
    };

    expect(whiteboardLiveSessionAdapter.validateAction("host", action).success).toBe(
      true
    );
    expect(
      whiteboardLiveSessionAdapter.validateAction("participant", action, state).success
    ).toBe(true);
    expect(whiteboardLiveSessionAdapter.validateAction("observer", action).success).toBe(
      false
    );
    expect(
      whiteboardLiveSessionAdapter.validateAction(
        "participant",
        { type: "delete" },
        state
      ).success
    ).toBe(false);
    expect(
      whiteboardLiveSessionAdapter.validateAction(
        "participant",
        { type: "whiteboard/delete", id: "stroke" },
        { ...state, objects: [action.object] }
      ).success
    ).toBe(true);
    expect(
      whiteboardLiveSessionAdapter.validateAction(
        "participant",
        { type: "whiteboard/delete", id: "stroke" },
        {
          ...state,
          objects: [action.object],
          session: { participantPermission: "draw-only", participantPreset: "young" },
        }
      ).success
    ).toBe(false);
    expect(
      whiteboardLiveSessionAdapter.validateAction(
        "participant",
        { type: "whiteboard/delete", id: "locked" },
        {
          ...state,
          objects: [{ ...action.object, id: "locked", locked: true }],
        }
      ).success
    ).toBe(false);
    expect(
      whiteboardLiveSessionAdapter.validateAction(
        "participant",
        { type: "whiteboard/replace", state },
        state
      ).success
    ).toBe(false);
    expect(
      whiteboardLiveSessionAdapter.validateAction(
        "participant",
        {
          ...action,
          object: {
            ...action.object,
            kind: "rectangle",
            fillColor: "transparent",
            strokeColor: "#112233",
            strokeWidth: 4,
            width: 20,
            height: 20,
          },
        },
        {
          ...state,
          session: { participantPermission: "draw-only", participantPreset: "young" },
        }
      ).success
    ).toBe(false);
    expect(
      whiteboardLiveSessionAdapter.validateAction(
        "participant",
        {
          type: "whiteboard/session-settings",
          session: { participantPermission: "draw-only", participantPreset: "older" },
        },
        state
      ).success
    ).toBe(false);
    const visualAction = {
      type: "whiteboard/add",
      object: {
        id: "sticker",
        kind: "visual",
        iconId: "animals-dog01",
        x: 40,
        y: 40,
        width: 120,
        height: 120,
      },
    };
    expect(
      whiteboardLiveSessionAdapter.validateAction("participant", visualAction, state)
        .success
    ).toBe(true);
    expect(
      whiteboardLiveSessionAdapter.validateAction("participant", visualAction, {
        ...state,
        session: { participantPermission: "draw-only", participantPreset: "young" },
      }).success
    ).toBe(false);
    expect(
      whiteboardLiveSessionAdapter.validateAction(
        "participant",
        { type: "whiteboard/erase", points: [{ x: 1, y: 1 }], radius: 18 },
        {
          ...state,
          objects: [action.object],
          session: { participantPermission: "draw-only", participantPreset: "young" },
        }
      ).success
    ).toBe(false);
    expect(
      whiteboardLiveSessionAdapter.validateAction(
        "participant",
        { type: "whiteboard/clear" },
        state
      ).success
    ).toBe(false);
    expect(
      whiteboardLiveSessionAdapter.validateAction(
        "host",
        { type: "whiteboard/clear" },
        state
      ).success
    ).toBe(true);
  });

  it("accepts normal curated visual objects as shared participant additions", () => {
    const result = whiteboardLiveSessionAdapter.validateAction(
      "participant",
      {
        type: "whiteboard/add",
        object: {
          id: "sticker",
          kind: "visual",
          iconId: "calm",
          x: 100,
          y: 100,
          width: 140,
          height: 140,
        },
      },
      { version: 1, objects: [], session: { participantPermission: "everything" } }
    );
    expect(result.success).toBe(true);
  });

  it("keeps tools and colors local while synchronizing host participant settings", () => {
    const state = projectWhiteboardForLiveSession(board([]), {
      participantPermission: "draw-only",
      participantPreset: "older",
    });
    expect(state).toEqual(
      expect.objectContaining({
        session: {
          participantPermission: "draw-only",
          participantPreset: "older",
        },
      })
    );
    expect(state).not.toHaveProperty("tool");
    expect(state).not.toHaveProperty("strokeColor");
  });

  it("rejects malformed or local-media snapshots", () => {
    expect(
      whiteboardLiveSessionAdapter.validateSnapshot({
        version: 1,
        objects: [{ id: "image", kind: "image", assetId: "not-shareable" }],
      }).success
    ).toBe(false);
    expect(
      whiteboardLiveSessionAdapter.validateSnapshot({ version: 1, objects: [] }).success
    ).toBe(true);
  });
});
