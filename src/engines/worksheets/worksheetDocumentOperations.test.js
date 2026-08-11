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
  updateWorksheetBlock,
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
});
