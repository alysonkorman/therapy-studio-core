import { describe, expect, it } from "vitest";

import {
  createBlankWorksheetDocument,
  worksheetBlockSchema,
  worksheetDocumentSchema,
} from "./worksheetDocument";

describe("Worksheet Document", () => {
  it("creates a versioned blank document with one safe page", () => {
    const document = createBlankWorksheetDocument("worksheet-1", {
      createId: () => "page-1",
      now: "2026-08-04T12:00:00.000Z",
    });
    expect(document.documentVersion).toBe(1);
    expect(document.pages).toHaveLength(1);
    expect(document.pages[0].blocks).toEqual([]);
  });

  it("rejects duplicate IDs, unknown fields, and HTML", () => {
    const document = createBlankWorksheetDocument("worksheet-1", {
      createId: () => "page-1",
      now: "2026-08-04T12:00:00.000Z",
    });
    const block = {
      id: "block-1",
      type: "heading",
      sortOrder: 0,
      text: "Safe",
      level: 2,
      alignment: "left",
    };
    expect(() =>
      worksheetDocumentSchema.parse({
        ...document,
        pages: [{ ...document.pages[0], blocks: [block, block] }],
      })
    ).toThrow();
    expect(() => worksheetDocumentSchema.parse({ ...document, extra: true })).toThrow();
    expect(() =>
      worksheetDocumentSchema.parse({
        ...document,
        pages: [
          {
            ...document.pages[0],
            blocks: [{ ...block, text: "<script>alert(1)</script>" }],
          },
        ],
      })
    ).toThrow();
  });
  it.each([
    {
      type: "reflection",
      title: "What happened?",
      instruction: "Write a few thoughts.",
      lineCount: 4,
    },
    {
      type: "basic-table",
      headers: ["Before", "After"],
      rows: [["", ""]],
    },
    {
      type: "sentence-completion",
      textBefore: "I feel",
      textAfter: "when this happens.",
      blankSize: "medium",
    },
    {
      type: "cbt-thought-check",
      labels: {
        situation: "Situation",
        thought: "Thought",
        feeling: "Feeling",
        evidenceFor: "Evidence For",
        evidenceAgainst: "Evidence Against",
        balancedThought: "More Balanced Thought",
      },
      lineCount: 2,
    },
    {
      type: "coping-plan",
      triggerPrompt: "When this happens",
      choicesPrompt: "I could",
      choices: ["Breathe", "Ask for help"],
      tryPrompt: "I will try",
      helpedPrompt: "What helped",
      lineCount: 2,
    },
  ])("validates the $type structured block", (block) => {
    expect(() =>
      worksheetBlockSchema.parse({ id: `${block.type}-1`, sortOrder: 0, ...block })
    ).not.toThrow();
  });

  it("rejects table rows that do not match the header count", () => {
    const document = createBlankWorksheetDocument("worksheet-1", {
      createId: () => "page-1",
      now: "2026-08-04T12:00:00.000Z",
    });
    expect(() =>
      worksheetDocumentSchema.parse({
        ...document,
        pages: [
          {
            ...document.pages[0],
            blocks: [
              {
                id: "table-1",
                sortOrder: 0,
                type: "basic-table",
                headers: ["One", "Two", "Three"],
                rows: [["One", "Two"]],
              },
            ],
          },
        ],
      })
    ).toThrow(/number of column headers/i);
  });
});
