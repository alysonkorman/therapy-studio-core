import { describe, expect, it } from "vitest";

import { createBlankWorksheetDocument } from "../../models";
import {
  addWorksheetBlock,
  addWorksheetPage,
  deleteWorksheetBlock,
  deleteWorksheetPage,
  duplicateWorksheetBlock,
  duplicateWorksheetPage,
  moveWorksheetBlock,
  moveWorksheetPage,
  setWorksheetBlockLayer,
  setWorksheetPageLayoutMode,
  setWorksheetVisualBackground,
  setWorksheetVisualPlacement,
  updateWorksheetBlock,
  updateWorksheetBlockLayout,
} from "./worksheetDocumentOperations";

const ids = () => {
  let index = 0;
  return () => `id-${++index}`;
};

describe("Worksheet document operations", () => {
  it("creates every approved first-release block type", () => {
    const createId = ids();
    let document = createBlankWorksheetDocument("worksheet", {
      createId,
      now: "2026-08-04T12:00:00.000Z",
    });
    const pageId = document.pages[0].id;
    const types = [
      "heading",
      "instruction",
      "paragraph",
      "short-response",
      "long-response",
      "checklist",
      "multiple-choice",
      "rating-scale",
      "feelings-scale",
      "drawing-area",
      "visual",
      "reflection",
      "basic-table",
      "sentence-completion",
      "cbt-thought-check",
      "coping-plan",
      "divider",
      "spacer",
    ];

    types.forEach((type) => {
      document = addWorksheetBlock(document, pageId, type, createId);
    });

    expect(document.pages[0].blocks.map(({ type }) => type)).toEqual(types);
  });

  it("preserves visual settings when duplicating a block or page", () => {
    const createId = ids();
    let document = createBlankWorksheetDocument("worksheet", {
      createId,
      now: "2026-08-04T12:00:00.000Z",
    });
    const pageId = document.pages[0].id;
    document = addWorksheetBlock(document, pageId, "visual", createId);
    const visualId = document.pages[0].blocks[0].id;
    document = updateWorksheetBlock(document, pageId, visualId, {
      iconId: "curated-culture-holidays-watarun01",
      label: "Temple",
      decorative: false,
      size: "large",
      alignment: "right",
    });
    document = duplicateWorksheetBlock(document, pageId, visualId, createId);
    document = duplicateWorksheetPage(document, pageId, createId);

    const expected = expect.objectContaining({
      iconId: "curated-culture-holidays-watarun01",
      label: "Temple",
      decorative: false,
      size: "large",
      alignment: "right",
    });
    expect(document.pages[0].blocks[1]).toEqual(expected);
    expect(document.pages[1].blocks[0]).toEqual(expected);
  });

  it("edits, duplicates, reorders, and deletes structured blocks", () => {
    const createId = ids();
    let document = createBlankWorksheetDocument("worksheet", {
      createId,
      now: "2026-08-04T12:00:00.000Z",
    });
    const pageId = document.pages[0].id;
    document = addWorksheetBlock(document, pageId, "reflection", createId);
    document = addWorksheetBlock(document, pageId, "coping-plan", createId);
    const reflectionId = document.pages[0].blocks[0].id;
    document = updateWorksheetBlock(document, pageId, reflectionId, {
      title: "What would you try next time?",
    });
    document = duplicateWorksheetBlock(document, pageId, reflectionId, createId);
    document = moveWorksheetBlock(document, pageId, reflectionId, 1);
    document = deleteWorksheetBlock(document, pageId, reflectionId);

    expect(document.pages[0].blocks).toHaveLength(2);
    expect(document.pages[0].blocks[0]).toEqual(
      expect.objectContaining({
        type: "reflection",
        title: "What would you try next time?",
      })
    );
    expect(document.pages[0].blocks.map(({ sortOrder }) => sortOrder)).toEqual([0, 1]);
  });

  it("adds, edits, duplicates, reorders, and deletes blocks", () => {
    const createId = ids();
    let document = createBlankWorksheetDocument("worksheet", {
      createId,
      now: "2026-08-04T12:00:00.000Z",
    });
    const pageId = document.pages[0].id;
    document = addWorksheetBlock(document, pageId, "heading", createId);
    document = addWorksheetBlock(document, pageId, "paragraph", createId);
    const headingId = document.pages[0].blocks[0].id;
    document = updateWorksheetBlock(document, pageId, headingId, { text: "My heading" });
    document = duplicateWorksheetBlock(document, pageId, headingId, createId);
    document = moveWorksheetBlock(document, pageId, headingId, 1);
    document = deleteWorksheetBlock(document, pageId, headingId);

    expect(document.pages[0].blocks.map(({ sortOrder }) => sortOrder)).toEqual([0, 1]);
    expect(document.pages[0].blocks.some(({ text }) => text === "My heading")).toBe(true);
  });

  it("adds, duplicates, reorders, and safely deletes pages", () => {
    const createId = ids();
    let document = createBlankWorksheetDocument("worksheet", {
      createId,
      now: "2026-08-04T12:00:00.000Z",
    });
    const firstId = document.pages[0].id;
    document = addWorksheetPage(document, createId);
    document = duplicateWorksheetPage(document, firstId, createId);
    document = moveWorksheetPage(document, firstId, 1);
    document = deleteWorksheetPage(document, firstId, createId);
    document = deleteWorksheetPage(document, document.pages[0].id, createId);
    document = deleteWorksheetPage(document, document.pages[0].id, createId);

    expect(document.pages).toHaveLength(1);
    expect(document.pages[0].blocks).toEqual([]);
  });

  it("keeps flow pages unchanged while freeform pages persist normalized geometry", () => {
    const createId = ids();
    let document = createBlankWorksheetDocument("worksheet", {
      createId,
      now: "2026-08-04T12:00:00.000Z",
    });
    const pageId = document.pages[0].id;
    document = addWorksheetBlock(document, pageId, "heading", createId);
    expect(document.pages[0].layoutMode).toBe("flow");
    expect(document.pages[0].blocks[0].layout).toBeUndefined();

    document = setWorksheetPageLayoutMode(document, pageId, "freeform");
    const blockId = document.pages[0].blocks[0].id;
    document = updateWorksheetBlockLayout(document, pageId, blockId, {
      x: 18,
      y: 22,
      width: 72,
      height: 20,
    });

    expect(document.pages[0]).toMatchObject({ layoutMode: "freeform" });
    expect(document.pages[0].blocks[0].layout).toMatchObject({
      x: 18,
      y: 22,
      width: 72,
      height: 20,
      locked: false,
    });
  });

  it("layers, locks, and backgrounds visual blocks without changing identity", () => {
    const createId = ids();
    let document = createBlankWorksheetDocument("worksheet", {
      createId,
      now: "2026-08-04T12:00:00.000Z",
    });
    const pageId = document.pages[0].id;
    document = setWorksheetPageLayoutMode(document, pageId, "freeform");
    document = addWorksheetBlock(document, pageId, "visual", createId);
    const visualId = document.pages[0].blocks[0].id;
    document = setWorksheetBlockLayer(document, pageId, visualId, "forward");
    document = setWorksheetVisualBackground(document, pageId, visualId);

    expect(document.pages[0].blocks[0]).toMatchObject({
      id: visualId,
      layout: { x: 4, y: 4, width: 92, height: 92, locked: true, zIndex: 0 },
    });
  });

  it("places freeform visuals quickly and offsets a selected duplicate", () => {
    const createId = ids();
    let document = createBlankWorksheetDocument("worksheet", {
      createId,
      now: "2026-08-04T12:00:00.000Z",
    });
    const pageId = document.pages[0].id;
    document = setWorksheetPageLayoutMode(document, pageId, "freeform");
    document = addWorksheetBlock(document, pageId, "visual", createId);
    const visualId = document.pages[0].blocks[0].id;

    document = setWorksheetVisualPlacement(
      document,
      pageId,
      visualId,
      "curated-example-visual",
      "large"
    );
    expect(document.pages[0].blocks[0]).toMatchObject({
      iconId: "curated-example-visual",
      layout: { x: 15, y: 15, width: 70, height: 70, locked: false },
    });

    document = duplicateWorksheetBlock(document, pageId, visualId, createId);
    expect(document.pages[0].blocks[1]).toMatchObject({
      iconId: "curated-example-visual",
      layout: { x: 18, y: 18, width: 70, height: 70, locked: false, zIndex: 1 },
    });

    document = setWorksheetVisualPlacement(
      document,
      pageId,
      visualId,
      "curated-replacement-visual",
      "background"
    );
    expect(document.pages[0].blocks[0]).toMatchObject({
      iconId: "curated-replacement-visual",
      layout: { x: 4, y: 4, width: 92, height: 92, locked: true, zIndex: 0 },
    });

    document = setWorksheetVisualPlacement(
      document,
      pageId,
      visualId,
      "curated-replaced-background",
      "normal"
    );
    expect(document.pages[0].blocks[0]).toMatchObject({
      iconId: "curated-replaced-background",
      layout: { x: 4, y: 4, width: 92, height: 92, locked: true, zIndex: 0 },
    });
  });
});
