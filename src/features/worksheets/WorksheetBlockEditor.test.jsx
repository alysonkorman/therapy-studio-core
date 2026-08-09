import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createWorksheetBlock } from "../../engines/worksheets/worksheetDocumentOperations";
import WorksheetBlockEditor from "./WorksheetBlockEditor";

function renderEditor(type) {
  const handlers = {
    onApply: vi.fn(),
    onClearSelection: vi.fn(),
    onDelete: vi.fn(),
    onDuplicate: vi.fn(),
    onMove: vi.fn(),
  };
  const block = createWorksheetBlock(type, 0, () => `${type}-1`);
  render(<WorksheetBlockEditor block={block} {...handlers} position={0} total={2} />);
  return { block, ...handlers };
}

async function apply(user) {
  await user.click(screen.getByRole("button", { name: "Apply Block Changes" }));
}

describe("WorksheetBlockEditor", () => {
  it("edits heading level and alignment as schema-valid values", async () => {
    const user = userEvent.setup();
    const { onApply } = renderEditor("heading");

    await user.selectOptions(screen.getByLabelText("Level"), "1");
    await user.selectOptions(screen.getByLabelText("Alignment"), "center");
    await apply(user);

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ level: 1, alignment: "center" })
    );
  });

  it.each(["instruction", "paragraph"])("edits %s alignment", async (type) => {
    const user = userEvent.setup();
    const { onApply } = renderEditor(type);
    await user.selectOptions(screen.getByLabelText("Alignment"), "right");
    await apply(user);
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ alignment: "right" }));
  });

  it("edits response lines and drawing height", async () => {
    const user = userEvent.setup();
    const response = renderEditor("long-response");
    await user.clear(screen.getByLabelText("Response Lines"));
    await user.type(screen.getByLabelText("Response Lines"), "8");
    await apply(user);
    expect(response.onApply).toHaveBeenCalledWith(
      expect.objectContaining({ lineCount: 8 })
    );

    cleanup();
    const drawing = renderEditor("drawing-area");
    await user.selectOptions(screen.getByLabelText("Height"), "large");
    await apply(user);
    expect(drawing.onApply).toHaveBeenCalledWith(
      expect.objectContaining({ height: "large" })
    );
  });

  it("edits checklist and multiple-choice behavior", async () => {
    const user = userEvent.setup();
    const checklist = renderEditor("checklist");
    await user.click(screen.getByLabelText("Include an “Other” choice"));
    await apply(user);
    expect(checklist.onApply).toHaveBeenCalledWith(
      expect.objectContaining({ allowOther: true })
    );

    cleanup();
    const choices = renderEditor("multiple-choice");
    await user.selectOptions(screen.getByLabelText("Selection Mode"), "multiple");
    await apply(user);
    expect(choices.onApply).toHaveBeenCalledWith(
      expect.objectContaining({ selectionMode: "multiple" })
    );
  });

  it("edits rating bounds and number visibility", async () => {
    const user = userEvent.setup();
    const { onApply } = renderEditor("rating-scale");
    await user.clear(screen.getByLabelText("Minimum"));
    await user.type(screen.getByLabelText("Minimum"), "0");
    await user.clear(screen.getByLabelText("Maximum"));
    await user.type(screen.getByLabelText("Maximum"), "10");
    await user.click(screen.getByLabelText("Show numbers on the scale"));
    await apply(user);
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ minimum: 0, maximum: 10, showNumbers: false })
    );
  });

  it.each([
    ["divider", "Style", "dotted", { style: "dotted" }],
    ["spacer", "Size", "large", { size: "large" }],
  ])("edits %s presentation", async (type, label, option, expected) => {
    const user = userEvent.setup();
    const { onApply } = renderEditor(type);
    await user.selectOptions(screen.getByLabelText(label), option);
    await apply(user);
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining(expected));
  });

  it("keeps selection actions accessible", async () => {
    const user = userEvent.setup();
    const handlers = renderEditor("heading");

    expect(screen.getByRole("button", { name: "Move Up" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Move Down" }));
    await user.click(screen.getByRole("button", { name: "Duplicate" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Clear Selection" }));

    expect(handlers.onMove).toHaveBeenCalledWith(1);
    expect(handlers.onDuplicate).toHaveBeenCalledOnce();
    expect(handlers.onDelete).toHaveBeenCalledOnce();
    expect(handlers.onClearSelection).toHaveBeenCalledOnce();
  });
});
