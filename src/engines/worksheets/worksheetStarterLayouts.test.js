import { describe, expect, it } from "vitest";

import { createBlankWorksheetDocument } from "../../models";
import {
  applyWorksheetStarter,
  worksheetStarterLayouts,
} from "./worksheetStarterLayouts";

const ids = () => {
  let index = 0;
  return () => `starter-${++index}`;
};

describe("Worksheet quick-start layouts", () => {
  it("offers freeform session-speed starting layouts alongside flow layouts", () => {
    expect(worksheetStarterLayouts.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "blank-freeform",
        "visual-labels",
        "decorate",
        "map",
        "reflection-visual",
        "two-sides",
        "comparison-grid",
        "problem-scale",
        "three-columns",
        "idea-bank",
      ])
    );
  });

  it.each([
    ["blank-freeform", 0],
    ["visual-labels", 1],
    ["decorate", 1],
    ["map", 5],
    ["reflection-visual", 2],
    ["two-sides", 3],
    ["comparison-grid", 2],
    ["problem-scale", 6],
    ["three-columns", 2],
    ["idea-bank", 5],
  ])("creates %s as a valid freeform page", (starterId, minimumBlocks) => {
    const createId = ids();
    const document = createBlankWorksheetDocument("worksheet", {
      createId,
      now: "2026-08-13T12:00:00.000Z",
    });
    const result = applyWorksheetStarter(document, starterId, createId);

    expect(result.pages[0].layoutMode).toBe("freeform");
    expect(result.pages[0].blocks.length).toBeGreaterThanOrEqual(minimumBlocks);
    result.pages[0].blocks.forEach((block) => {
      expect(block.layout).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number),
        })
      );
    });
  });

  it("uses only editable built-in block types for the reusable layouts", () => {
    const document = createBlankWorksheetDocument("worksheet", {
      createId: ids(),
      now: "2026-08-13T12:00:00.000Z",
    });

    [
      "two-sides",
      "comparison-grid",
      "problem-scale",
      "three-columns",
      "idea-bank",
    ].forEach((starterId) => {
      const result = applyWorksheetStarter(document, starterId, ids());
      expect(result.pages[0].blocks.map(({ type }) => type)).toEqual(
        expect.arrayContaining(["heading"])
      );
    });
  });
});
