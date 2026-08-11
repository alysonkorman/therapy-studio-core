import { describe, expect, it } from "vitest";

import { createBlankWhiteboardDocument, whiteboardDocumentSchema } from "./whiteboard";

const now = "2026-08-11T12:00:00.000Z";

describe("Whiteboard document model", () => {
  it("creates a strict blank document", () => {
    expect(createBlankWhiteboardDocument({ id: "board", now })).toMatchObject({
      id: "board",
      objects: [],
    });
    expect(() =>
      whiteboardDocumentSchema.parse({
        ...createBlankWhiteboardDocument({ id: "board", now }),
        privateNotes: "not allowed",
      })
    ).toThrow();
  });

  it("validates strokes, text, and semantic SVG objects", () => {
    const document = createBlankWhiteboardDocument({ id: "board", now });
    expect(
      whiteboardDocumentSchema.parse({
        ...document,
        objects: [
          {
            id: "stroke",
            kind: "stroke",
            points: [
              { x: 1, y: 2 },
              { x: 3, y: 4 },
            ],
            color: "#112233",
            width: 4,
          },
          {
            id: "text",
            kind: "text",
            text: "Hello",
            x: 10,
            y: 20,
            color: "#112233",
            size: 24,
          },
          {
            id: "icon",
            kind: "visual",
            iconId: "known-icon",
            x: 20,
            y: 30,
            width: 100,
            height: 100,
          },
        ],
      }).objects
    ).toHaveLength(3);
  });
});
