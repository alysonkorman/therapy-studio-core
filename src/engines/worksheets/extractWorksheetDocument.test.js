import { describe, expect, it, vi } from "vitest";

import {
  extractWorksheetDocx,
  extractWorksheetPdf,
  extractWorksheetTxt,
} from "./extractWorksheetDocument";

describe("Worksheet document extraction", () => {
  it("reads non-empty TXT files", async () => {
    await expect(
      extractWorksheetTxt(new File(["Title: Check-In"], "check-in.txt"))
    ).resolves.toMatchObject({ text: "Title: Check-In", warnings: [] });
    await expect(extractWorksheetTxt(new File([""], "empty.txt"))).rejects.toThrow(
      /empty/i
    );
  });

  it("preserves DOCX headings, paragraphs, lists, and simple tables", async () => {
    const extract = vi.fn(async () => ({
      value:
        "<h1>Check-In</h1><p>Instructions</p><ul><li>First</li><li>Second</li></ul><table><tr><th>Feeling</th><th>Clue</th></tr><tr><td>Worried</td><td>Fast heart</td></tr></table>",
      messages: [],
    }));
    const result = await extractWorksheetDocx(new File(["docx"], "check-in.docx"), {
      extract,
    });
    expect(result.text).toContain("# Check-In");
    expect(result.text).toContain("- First\n- Second");
    expect(result.tables[0].rows).toEqual([
      ["Feeling", "Clue"],
      ["Worried", "Fast heart"],
    ]);
  });

  it("preserves text PDF page order and surfaces review warnings", async () => {
    const load = async () => ({
      numPages: 2,
      getPage: async (page) => ({
        getTextContent: async () => ({
          items: [{ str: page === 1 ? "Page One" : "Page Two" }],
        }),
      }),
    });
    const result = await extractWorksheetPdf(new File(["pdf"], "check-in.pdf"), {
      load,
    });
    expect(result.text).toBe("Page One\fPage Two");
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringMatching(/reading order/i)])
    );
  });

  it("rejects scanned or empty PDFs", async () => {
    const load = async () => ({
      numPages: 1,
      getPage: async () => ({ getTextContent: async () => ({ items: [] }) }),
    });
    await expect(
      extractWorksheetPdf(new File(["pdf"], "scan.pdf"), { load })
    ).rejects.toThrow(/require OCR/i);
  });
});
