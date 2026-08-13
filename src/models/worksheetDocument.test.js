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

  it("accepts an additive curated visual block without changing old documents", () => {
    const document = createBlankWorksheetDocument("worksheet-1", {
      createId: () => "page-1",
      now: "2026-08-04T12:00:00.000Z",
    });
    expect(() => worksheetDocumentSchema.parse(document)).not.toThrow();

    const parsed = worksheetDocumentSchema.parse({
      ...document,
      pages: [
        {
          ...document.pages[0],
          blocks: [
            {
              id: "visual-1",
              type: "visual",
              sortOrder: 0,
              iconId: "curated-culture-holidays-watarun01",
              label: "A calm temple illustration",
              decorative: false,
              size: "large",
              alignment: "right",
            },
          ],
        },
      ],
    });

    expect(parsed.pages[0].blocks[0]).toEqual(
      expect.objectContaining({
        type: "visual",
        iconId: "curated-culture-holidays-watarun01",
        size: "large",
        alignment: "right",
      })
    );
  });

  it("validates an additive freeform page and normalized positioned block", () => {
    const document = createBlankWorksheetDocument("worksheet-1", {
      createId: () => "page-1",
      now: "2026-08-04T12:00:00.000Z",
    });
    const parsed = worksheetDocumentSchema.parse({
      ...document,
      pages: [
        {
          ...document.pages[0],
          layoutMode: "freeform",
          blocks: [
            {
              id: "heading-1",
              type: "heading",
              sortOrder: 0,
              text: "Label this picture",
              layout: { x: 10, y: 12, width: 64, height: 14, zIndex: 2, locked: false },
            },
          ],
        },
      ],
    });
    expect(parsed.pages[0].layoutMode).toBe("freeform");
    expect(parsed.pages[0].blocks[0].layout?.width).toBe(64);
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

  it("validates completed-copy responses without changing old documents", () => {
    const document = createBlankWorksheetDocument("worksheet-1", {
      createId: () => "page-1",
      now: "2026-08-04T12:00:00.000Z",
    });
    const withBlock = {
      ...document,
      pages: [
        {
          ...document.pages[0],
          blocks: [
            {
              id: "response-1",
              sortOrder: 0,
              type: "short-response",
              prompt: "What happened?",
              placeholder: "",
              lineCount: 1,
            },
          ],
        },
      ],
    };
    expect(() => worksheetDocumentSchema.parse(withBlock)).not.toThrow();
    expect(
      worksheetDocumentSchema.parse({
        ...withBlock,
        sessionResponses: { "response-1": { text: "I took a break." } },
      }).sessionResponses
    ).toEqual({ "response-1": { text: "I took a break." } });
    expect(() =>
      worksheetDocumentSchema.parse({
        ...withBlock,
        sessionResponses: { missing: { text: "No matching block" } },
      })
    ).toThrow(/unknown block/i);
    expect(() =>
      worksheetDocumentSchema.parse({
        ...withBlock,
        sessionResponses: { "response-1": { text: "<b>unsafe</b>" } },
      })
    ).toThrow(/HTML/i);
  });
});
