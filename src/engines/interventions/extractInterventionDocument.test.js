import { describe, expect, it, vi } from "vitest";

import { extractDocx, extractPdf, extractTxt } from "./extractInterventionDocument";

describe("intervention document extraction", () => {
  it("reads TXT files", async () => {
    const result = await extractTxt(new File(["Title: Grounding"], "grounding.txt"));
    expect(result.text).toBe("Title: Grounding");
    expect(result.warnings).toEqual([]);
  });

  it("extracts DOCX text through the document reader", async () => {
    const extract = vi.fn(async () => ({
      value: "Title: Grounding\nSteps: Begin",
      messages: [{ message: "A footnote could not be converted." }],
    }));
    const result = await extractDocx(new File(["docx"], "grounding.docx"), {
      extract,
    });
    expect(result.text).toContain("Title: Grounding");
    expect(result.warnings).toContain("A footnote could not be converted.");
  });

  it("extracts text-based PDF pages in order", async () => {
    const getPage = vi.fn(async (page) => ({
      getTextContent: async () => ({
        items: [{ str: page === 1 ? "Title: Grounding" : "Steps: Begin" }],
      }),
    }));
    const load = vi.fn(async () => ({ numPages: 2, getPage }));
    const result = await extractPdf(new File(["pdf"], "grounding.pdf"), { load });
    expect(result.text).toBe("Title: Grounding\nSteps: Begin");
    expect(result.warnings[0]).toMatch(/text order/i);
  });

  it("rejects PDFs without extractable text and does not imply OCR support", async () => {
    const load = async () => ({
      numPages: 1,
      getPage: async () => ({ getTextContent: async () => ({ items: [] }) }),
    });
    await expect(extractPdf(new File(["pdf"], "scan.pdf"), { load })).rejects.toThrow(
      /scanned or image-only PDFs require OCR/i
    );
  });
});
