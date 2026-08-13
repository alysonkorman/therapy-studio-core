import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "../../test/test-utils";
import ActivityImportPanel from "./ActivityImportPanel";

const engine = vi.hoisted(() => ({
  loadPdfPages: vi.fn(),
  readImageFile: vi.fn(),
  renderPdfPage: vi.fn(),
  validateActivityFile: vi.fn((file) => file),
}));

vi.mock("../../engines/whiteboard/activityImport", () => engine);

describe("ActivityImportPanel", () => {
  it("offers page selection for a multi-page PDF and imports the selected page", async () => {
    const user = userEvent.setup();
    const pdf = { numPages: 3 };
    const media = {
      blob: new Blob(["page"], { type: "image/png" }),
      width: 900,
      height: 1200,
    };
    engine.loadPdfPages.mockResolvedValue({ pdf, pageCount: 3 });
    engine.renderPdfPage.mockResolvedValue(media);
    const onImport = vi.fn(async () => {});
    renderWithRouter(<ActivityImportPanel onCancel={vi.fn()} onImport={onImport} />);

    await user.upload(
      screen.getByLabelText("Activity file"),
      new File(["pdf"], "maze.pdf", { type: "application/pdf" })
    );
    expect(await screen.findByRole("combobox", { name: "PDF page" })).toBeVisible();
    await user.selectOptions(screen.getByRole("combobox", { name: "PDF page" }), "2");
    await user.click(screen.getByRole("button", { name: "Open as Activity" }));

    expect(engine.renderPdfPage).toHaveBeenCalledWith(pdf, 2);
    expect(onImport).toHaveBeenCalledWith({
      ...media,
      mode: "activity",
      sourceName: "maze.pdf",
    });
  });

  it("reports invalid local files without importing", async () => {
    engine.validateActivityFile.mockImplementationOnce(() => {
      throw new Error("Choose a PDF, JPG, PNG, or WebP file.");
    });
    const onImport = vi.fn();
    renderWithRouter(<ActivityImportPanel onCancel={vi.fn()} onImport={onImport} />);

    fireEvent.change(screen.getByLabelText("Activity file"), {
      target: { files: [new File(["bad"], "notes.txt", { type: "text/plain" })] },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a PDF");
    expect(onImport).not.toHaveBeenCalled();
  });
});
