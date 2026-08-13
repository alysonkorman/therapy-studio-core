import { LOCAL_MEDIA_MAX_BYTES, localMediaMimeTypes } from "../../models/localMediaAsset";

export class ActivityImportError extends Error {
  constructor(message, { cause } = {}) {
    super(message, { cause });
    this.name = "ActivityImportError";
  }
}

export function validateActivityFile(file) {
  if (![...localMediaMimeTypes, "application/pdf"].includes(file.type)) {
    throw new ActivityImportError("Choose a PDF, JPG, PNG, or WebP file.");
  }
  if (!file.size || file.size > LOCAL_MEDIA_MAX_BYTES) {
    throw new ActivityImportError("Choose a file smaller than 15 MB.");
  }
  return file;
}

export function fitActivity({ width, height }, bounds = { width: 1000, height: 700 }) {
  const scale = Math.min(bounds.width / width, bounds.height / height);
  const fittedWidth = width * scale;
  const fittedHeight = height * scale;
  return {
    x: (bounds.width - fittedWidth) / 2,
    y: (bounds.height - fittedHeight) / 2,
    width: fittedWidth,
    height: fittedHeight,
  };
}

export async function readImageFile(
  file,
  { createImageBitmapImpl = createImageBitmap } = {}
) {
  validateActivityFile(file);
  try {
    const bitmap = await createImageBitmapImpl(file);
    const result = {
      blob: file,
      mimeType: file.type,
      width: bitmap.width,
      height: bitmap.height,
    };
    bitmap.close?.();
    return result;
  } catch (error) {
    throw new ActivityImportError("Therapy Studio could not read this image.", {
      cause: error,
    });
  }
}

export async function loadPdfPages(file, { load } = {}) {
  validateActivityFile(file);
  try {
    const loadPdf =
      load ??
      (async (data) => {
        const [pdfjs, worker] = await Promise.all([
          import("pdfjs-dist/legacy/build/pdf.mjs"),
          import("pdfjs-dist/legacy/build/pdf.worker.mjs?url"),
        ]);
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        return pdfjs.getDocument({ data }).promise;
      });
    const pdf = await loadPdf(new Uint8Array(await file.arrayBuffer()));
    return { pdf, pageCount: pdf.numPages };
  } catch (error) {
    throw new ActivityImportError("Therapy Studio could not read this PDF.", {
      cause: error,
    });
  }
}

export async function renderPdfPage(pdf, pageNumber, { scale = 1.5 } = {}) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("PDF rendering failed"))),
      "image/png"
    )
  );
  return { blob, mimeType: "image/png", width: canvas.width, height: canvas.height };
}
