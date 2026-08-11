export class InterventionExtractionError extends Error {
  constructor(message, { cause } = {}) {
    super(message, { cause });
    this.name = "InterventionExtractionError";
  }
}

export async function extractTxt(file) {
  const text = await file.text();
  if (!text.trim()) throw new InterventionExtractionError("The text file is empty.");
  return { text, warnings: [] };
}

export async function extractDocx(
  file,
  {
    extract = async (arrayBuffer) =>
      (await import("mammoth")).extractRawText({ arrayBuffer }),
  } = {}
) {
  try {
    const result = await extract(await file.arrayBuffer());
    if (!result.value?.trim()) {
      throw new InterventionExtractionError("No readable text was found in this DOCX.");
    }
    return {
      text: result.value,
      warnings: (result.messages ?? []).map(({ message }) => message),
    };
  } catch (error) {
    if (error instanceof InterventionExtractionError) throw error;
    throw new InterventionExtractionError("Therapy Studio could not read this DOCX.", {
      cause: error,
    });
  }
}

export async function extractPdf(
  file,
  {
    load = async (data) =>
      (await import("pdfjs-dist/legacy/build/pdf.mjs")).getDocument({ data }).promise,
  } = {}
) {
  try {
    const document = await load(new Uint8Array(await file.arrayBuffer()));
    const pages = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str).join(" "));
    }
    const text = pages.join("\n").trim();
    if (!text) {
      throw new InterventionExtractionError(
        "No readable text was found. Scanned or image-only PDFs require OCR, which is not supported yet."
      );
    }
    return {
      text,
      warnings: [
        "PDF text order may differ from the original layout. Review the extracted content carefully.",
      ],
    };
  } catch (error) {
    if (error instanceof InterventionExtractionError) throw error;
    throw new InterventionExtractionError(
      "Therapy Studio could not extract readable text from this PDF.",
      { cause: error }
    );
  }
}

export function extractInterventionFile(file, type, options) {
  if (type === "txt") return extractTxt(file);
  if (type === "docx") return extractDocx(file, options);
  if (type === "pdf") return extractPdf(file, options);
  throw new InterventionExtractionError(`Unsupported Intervention file type: ${type}`);
}
