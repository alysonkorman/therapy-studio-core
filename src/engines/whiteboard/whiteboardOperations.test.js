import { describe, expect, it } from "vitest";

import { createBlankWhiteboardDocument } from "../../models";
import {
  duplicateWhiteboardObject,
  moveWhiteboardObjectLayer,
  resetWhiteboardMarks,
  setWhiteboardImageBackground,
} from "./whiteboardOperations";

const now = "2026-08-13T12:00:00.000Z";

describe("Whiteboard activity operations", () => {
  it("duplicates an object with a new ID and visible offset", () => {
    const document = {
      ...createBlankWhiteboardDocument({ id: "board", now }),
      objects: [{ id: "shape", kind: "rectangle", x: 10, y: 20, width: 80 }],
    };

    expect(duplicateWhiteboardObject(document, "shape", "copy").objects).toEqual([
      expect.objectContaining({ id: "shape", x: 10, y: 20 }),
      expect.objectContaining({ id: "copy", x: 30, y: 40 }),
    ]);
  });

  it("moves an object one layer forward or backward", () => {
    const document = {
      ...createBlankWhiteboardDocument({ id: "board", now }),
      objects: [
        { id: "first", kind: "rectangle" },
        { id: "second", kind: "rectangle" },
        { id: "third", kind: "rectangle" },
      ],
    };

    const forward = moveWhiteboardObjectLayer(document, "second", 1);
    expect(forward.objects.map(({ id }) => id)).toEqual(["first", "third", "second"]);
    expect(moveWhiteboardObjectLayer(forward, "second", -1).objects).toEqual(
      document.objects
    );
  });

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
