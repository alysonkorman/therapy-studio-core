import { describe, expect, it } from "vitest";

import { createBlankWhiteboardDocument } from "../../models";
import {
  resetWhiteboardMarks,
  setWhiteboardImageBackground,
} from "./whiteboardOperations";

const now = "2026-08-13T12:00:00.000Z";

describe("Whiteboard activity operations", () => {
  it("sets an image as the sole locked background", () => {
    const document = {
      ...createBlankWhiteboardDocument({ id: "board", now }),
      objects: [
        { id: "first", kind: "image", background: true, locked: true },
        { id: "second", kind: "image", background: false, locked: false },
      ],
    };
    expect(setWhiteboardImageBackground(document, "second").objects).toEqual([
      expect.objectContaining({ id: "first", background: false }),
      expect.objectContaining({ id: "second", background: true, locked: true }),
    ]);
  });

  it("resets marks while preserving the activity source", () => {
    const document = {
      ...createBlankWhiteboardDocument({ id: "board", now }),
      objects: [
        { id: "activity", kind: "image", background: true },
        { id: "mark", kind: "stroke" },
      ],
    };
    expect(resetWhiteboardMarks(document).objects).toEqual([
      expect.objectContaining({ id: "activity" }),
    ]);
  });
});
