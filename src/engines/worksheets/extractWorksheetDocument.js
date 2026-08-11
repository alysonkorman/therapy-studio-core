export class WorksheetExtractionError extends Error {
  constructor(message, { cause } = {}) {
    super(message, { cause });
    this.name = "WorksheetExtractionError";
  }
}

function readableText(value, message) {
  const text = String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
  if (!text) throw new WorksheetExtractionError(message);
  return text;
}

export async function extractWorksheetTxt(file) {
  return {
    text: readableText(await file.text(), "The text file is empty."),
    warnings: [],
  };
}

function htmlToSemanticText(html) {
  const document = new DOMParser().parseFromString(html, "text/html");
  const pages = [[]];
  const tables = [];
  for (const element of document.body.children) {
    if (element.tagName === "TABLE") {
      const rows = [...element.querySelectorAll("tr")].map((row) =>
        [...row.querySelectorAll("th, td")].map((cell) => cell.textContent.trim())
      );
      if (rows.length) tables.push({ pageIndex: pages.length - 1, rows });
      continue;
    }
    if (["UL", "OL"].includes(element.tagName)) {
      [...element.querySelectorAll(":scope > li")].forEach((item, index) => {
        const marker = element.tagName === "OL" ? `${index + 1}.` : "-";
        pages.at(-1).push(`${marker} ${item.textContent.trim()}`);
      });
      continue;
    }
    const text = element.textContent.trim();
    if (!text) continue;
    const prefix = /^H[1-6]$/.test(element.tagName) ? "# " : "";
    pages.at(-1).push(`${prefix}${text}`);
  }
  return {
    text: pages.map((page) => page.join("\n")).join("\f"),
    tables,
    hasVisuals: Boolean(document.querySelector("img, svg")),
  };
}

export async function extractWorksheetDocx(
  file,
  {
    extract = async (arrayBuffer) =>
      (await import("mammoth")).convertToHtml({ arrayBuffer }),
  } = {}
) {
  try {
    const result = await extract(await file.arrayBuffer());
    const semantic = htmlToSemanticText(result.value);
    return {
      ...semantic,
      text: readableText(semantic.text, "No readable text was found in this DOCX."),
      warnings: [
        ...(result.messages ?? []).map(({ message }) => message),
        ...(semantic.hasVisuals
          ? ["Some visual content from the source may need to be added manually."]
          : []),
      ],
    };
  } catch (error) {
    if (error instanceof WorksheetExtractionError) throw error;
    throw new WorksheetExtractionError("Therapy Studio could not read this DOCX.", {
      cause: error,
    });
  }
}

export async function extractWorksheetPdf(
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
      pages.push(
        content.items
          .map((item) => `${item.str}${item.hasEOL ? "\n" : " "}`)
          .join("")
          .trim()
      );
    }
    const text = readableText(
      pages.join("\f"),
      "No readable text was found. Scanned or image-only PDFs require OCR, which is not supported yet."
    );
    return {
      text,
      warnings: [
        "PDF reading order and page structure may need review.",
        "Some visual content from the source may need to be added manually.",
      ],
    };
  } catch (error) {
    if (error instanceof WorksheetExtractionError) throw error;
    throw new WorksheetExtractionError(
      "Therapy Studio could not extract readable text from this PDF.",
      { cause: error }
    );
  }
}

export function extractWorksheetFile(file, type, options) {
  if (type === "txt") return extractWorksheetTxt(file);
  if (type === "docx") return extractWorksheetDocx(file, options);
  if (type === "pdf") return extractWorksheetPdf(file, options);
  throw new WorksheetExtractionError(`Unsupported Worksheet file type: ${type}`);
}
