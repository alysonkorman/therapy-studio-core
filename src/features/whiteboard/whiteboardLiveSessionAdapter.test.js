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
    });
    expect(JSON.stringify(state)).not.toContain("local-only");
  });

  it("allows validated replacement actions for host and participant only", () => {
    const state = { version: 1, objects: [] };
    const action = { type: "whiteboard/replace", state };

    expect(whiteboardLiveSessionAdapter.validateAction("host", action).success).toBe(
      true
    );
    expect(
      whiteboardLiveSessionAdapter.validateAction("participant", action).success
    ).toBe(true);
    expect(whiteboardLiveSessionAdapter.validateAction("observer", action).success).toBe(
      false
    );
    expect(
      whiteboardLiveSessionAdapter.validateAction("participant", { type: "delete" })
        .success
    ).toBe(false);
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
