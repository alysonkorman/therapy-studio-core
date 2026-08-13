import { describe, expect, it, vi } from "vitest";

import {
  ActivityImportError,
  fitActivity,
  loadPdfPages,
  readImageFile,
  validateActivityFile,
} from "./activityImport";

describe("Whiteboard activity import", () => {
  it.each([
    ["activity.jpg", "image/jpeg"],
    ["activity.png", "image/png"],
    ["activity.webp", "image/webp"],
  ])("reads supported image %s", async (name, type) => {
    const file = new File(["image"], name, { type });
    const result = await readImageFile(file, {
      createImageBitmapImpl: vi.fn(async () => ({ width: 800, height: 600 })),
    });
    expect(result).toMatchObject({ blob: file, mimeType: type, width: 800, height: 600 });
  });

  it("loads one-page and multi-page PDFs for page selection", async () => {
    for (const pageCount of [1, 4]) {
      const file = new File(["pdf"], "maze.pdf", { type: "application/pdf" });
      const pdf = { numPages: pageCount };
      await expect(loadPdfPages(file, { load: vi.fn(async () => pdf) })).resolves.toEqual(
        {
          pdf,
          pageCount,
        }
      );
    }
  });

  it("rejects unsupported and oversized files", () => {
    expect(() =>
      validateActivityFile(new File(["x"], "bad.txt", { type: "text/plain" }))
    ).toThrow(ActivityImportError);
    const oversized = { name: "large.png", type: "image/png", size: 16 * 1024 * 1024 };
    expect(() => validateActivityFile(oversized)).toThrow("smaller than 15 MB");
  });

  it("fits and centers activities without changing their aspect ratio", () => {
    expect(fitActivity({ width: 800, height: 1200 })).toEqual({
      x: 266.66666666666663,
      y: 0,
      width: 466.6666666666667,
      height: 700,
    });
  });
});
