import { describe, expect, it } from "vitest";

import {
  createBlankWorksheetDocument,
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
});
