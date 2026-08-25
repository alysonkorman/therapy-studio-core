import { describe, expect, it } from "vitest";

import { clearWhiteboardObjects, eraseWhiteboardObjects } from "./whiteboardErase";

const stroke = {
  id: "stroke-1",
  kind: "stroke",
  points: [
    { x: 10, y: 50 },
    { x: 50, y: 50 },
    { x: 90, y: 50 },
  ],
  color: "#112233",
  width: 4,
};

describe("Whiteboard erasing", () => {
  it("splits only the erased section of an unlocked freehand stroke", () => {
    const result = eraseWhiteboardObjects([stroke], [{ x: 50, y: 50 }], 10);

    expect(result.before).toEqual([stroke]);
    expect(result.objects).toHaveLength(2);
    expect(result.objects.every((object) => object.kind === "stroke")).toBe(true);
    expect(result.objects.map(({ id }) => id)).not.toContain(stroke.id);
    expect(result.objects[0].points.at(-1).x).toBeLessThan(50);
    expect(result.objects[1].points[0].x).toBeGreaterThan(50);
  });

  it("never erases locked content, while therapist Clear removes every object", () => {
    const locked = { ...stroke, id: "locked", locked: true };
    const note = {
      id: "note",
      kind: "text",
      text: "erase me",
      x: 20,
      y: 30,
      color: "#112233",
      size: 20,
    };

    expect(
      eraseWhiteboardObjects([locked, note], [{ x: 25, y: 25 }], 18).objects
    ).toEqual([locked]);
    expect(clearWhiteboardObjects([locked, note]).objects).toEqual([]);
  });
});
