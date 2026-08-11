import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createWorksheetBlock } from "../../engines/worksheets/worksheetDocumentOperations";
import WorksheetBlockEditor from "./WorksheetBlockEditor";

function renderEditor(type, overrides = {}) {
  const handlers = {
    onApply: vi.fn(),
    onClearSelection: vi.fn(),
    onDelete: vi.fn(),
    onDuplicate: vi.fn(),
    onMove: vi.fn(),
  };
  const block = { ...createWorksheetBlock(type, 0, () => `${type}-1`), ...overrides };
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

  it("chooses, changes, clears, sizes, and aligns a curated SVG", async () => {
    const user = userEvent.setup();
    const { onApply } = renderEditor("visual", { iconId: "ideas" });

    await user.click(screen.getByRole("button", { name: /change svg/i }));
    await user.type(
      screen.getByRole("searchbox", { name: /search icons/i }),
      "watarun01"
    );
    await user.dblClick(screen.getByRole("button", { name: /select watarun01/i }));
    await user.selectOptions(screen.getByLabelText("Size"), "large");
    await user.selectOptions(screen.getByLabelText("Alignment"), "right");
    await user.click(screen.getByLabelText(/decorative visual/i));
    await user.type(screen.getByLabelText("Label"), "Temple");
    await apply(user);

    expect(onApply).toHaveBeenLastCalledWith(
      expect.objectContaining({
        iconId: "curated-culture-holidays-watarun01",
        label: "Temple",
        decorative: false,
        size: "large",
        alignment: "right",
      })
    );

    await user.click(screen.getByRole("button", { name: "Clear SVG" }));
    await apply(user);
    expect(onApply).toHaveBeenLastCalledWith(expect.objectContaining({ iconId: null }));
  });

  it("edits Reflection and Sentence Completion settings", async () => {
    const user = userEvent.setup();
    const reflection = renderEditor("reflection");
    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "What happened?");
    await user.clear(screen.getByLabelText("Response Lines"));
    await user.type(screen.getByLabelText("Response Lines"), "7");
    await apply(user);
    expect(reflection.onApply).toHaveBeenCalledWith(
      expect.objectContaining({ title: "What happened?", lineCount: 7 })
    );

    cleanup();
    const sentence = renderEditor("sentence-completion");
    await user.clear(screen.getByLabelText("Text Before"));
    await user.type(screen.getByLabelText("Text Before"), "I feel");
    await user.selectOptions(screen.getByLabelText("Blank Size"), "long");
    await apply(user);
    expect(sentence.onApply).toHaveBeenCalledWith(
      expect.objectContaining({ textBefore: "I feel", blankSize: "long" })
    );
  });

  it("edits Basic Table rows and columns", async () => {
    const user = userEvent.setup();
    const table = renderEditor("basic-table");
    await user.clear(screen.getByLabelText(/column headers/i));
    await user.type(screen.getByLabelText(/column headers/i), "Before\nDuring\nAfter");
    await user.clear(screen.getByLabelText(/rows \(one row/i));
    await user.type(screen.getByLabelText(/rows \(one row/i), "A | B | C\nD | E | F");
    await apply(user);
    expect(table.onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: ["Before", "During", "After"],
        rows: [
          ["A", "B", "C"],
          ["D", "E", "F"],
        ],
      })
    );
  });

  it("edits CBT Thought Check and Coping Plan wording", async () => {
    const user = userEvent.setup();
    const thoughtCheck = renderEditor("cbt-thought-check");
    await user.clear(screen.getByLabelText("Thought Label"));
    await user.type(screen.getByLabelText("Thought Label"), "What my mind said");
    await apply(user);
    expect(thoughtCheck.onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        labels: expect.objectContaining({ thought: "What my mind said" }),
      })
    );

    cleanup();
    const copingPlan = renderEditor("coping-plan");
    fireEvent.change(screen.getByLabelText("Choices"), {
      target: { value: "Breathe\nAsk for help" },
    });
    await apply(user);
    expect(copingPlan.onApply).toHaveBeenCalledWith(
      expect.objectContaining({ choices: ["Breathe", "Ask for help"] })
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
