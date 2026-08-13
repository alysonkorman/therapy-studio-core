import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import WorksheetDocumentRenderer from "./WorksheetDocumentRenderer";

const visualLayout = { x: 4, y: 4, width: 92, height: 92, zIndex: 0, locked: true };

function freeformDocument(overrides = {}) {
  return {
    pages: [
      {
        id: "page-freeform",
        title: "Freeform Page",
        layoutMode: "freeform",
        settings: { paperSize: "letter", orientation: "portrait", margin: "normal" },
        blocks: [
          {
            id: "visual",
            type: "visual",
            iconId: "curated-culture-holidays-watarun01",
            label: "Background visual",
            decorative: false,
            size: "xl",
            alignment: "center",
            sortOrder: 0,
            layout: visualLayout,
          },
          {
            id: "text",
            type: "paragraph",
            text: "Name this part",
            alignment: "left",
            sortOrder: 1,
            layout: { x: 10, y: 10, width: 20, height: 10, zIndex: 3, locked: false },
          },
          {
            id: "reflection",
            type: "reflection",
            title: "What do you notice?",
            instruction: "",
            lineCount: 2,
            sortOrder: 2,
            layout: { x: 12, y: 65, width: 60, height: 20, zIndex: 4, locked: false },
          },
          {
            id: "arrow",
            type: "line",
            strokeColor: "#6C46C3",
            strokeWidth: 3,
            arrowhead: true,
            label: "Look here",
            sortOrder: 3,
            layout: { x: 48, y: 30, width: 30, height: 8, zIndex: 5, locked: false },
          },
        ],
        ...overrides,
      },
    ],
  };
}

function setPaperBounds() {
  const paper = screen.getByRole("article", { name: "Freeform Page" });
  vi.spyOn(paper, "getBoundingClientRect").mockReturnValue({
    bottom: 600,
    height: 600,
    left: 0,
    right: 400,
    top: 0,
    width: 400,
    x: 0,
    y: 0,
  });
  return paper;
}

describe("Worksheet Freeform Builder interactions", () => {
  it("places text at the page location and supports direct movement, keyboard movement, and center guides", async () => {
    const user = userEvent.setup();
    const onAddTextAt = vi.fn();
    const onLayoutChange = vi.fn();
    const onSelectBlock = vi.fn();
    render(
      <WorksheetDocumentRenderer
        document={freeformDocument()}
        onAddTextAt={onAddTextAt}
        onLayoutChange={onLayoutChange}
        onSelectBlock={onSelectBlock}
        selectedBlockId="text"
      />
    );
    const paper = setPaperBounds();
    const text = screen.getByRole("button", { name: "Edit paragraph block" });

    fireEvent.click(paper, { clientX: 200, clientY: 300 });
    expect(onAddTextAt).toHaveBeenCalledWith({ x: 50, y: 50 });
    fireEvent.click(screen.getByRole("button", { name: "Edit visual block" }), {
      clientX: 120,
      clientY: 180,
    });
    expect(onAddTextAt).toHaveBeenLastCalledWith({ x: 30, y: 30 });

    fireEvent.pointerDown(text, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(text, { clientX: 100, clientY: 100, pointerId: 1 });
    expect(onLayoutChange).toHaveBeenLastCalledWith("text", { x: 10, y: 10 });

    fireEvent.pointerDown(text, { clientX: 100, clientY: 100, pointerId: 2 });
    fireEvent.pointerMove(text, { clientX: 220, clientY: 100, pointerId: 2 });
    expect(document.querySelector(".worksheet-center-guide--vertical")).toBeTruthy();
    fireEvent.pointerMove(text, { clientX: 220, clientY: 310, pointerId: 2 });
    expect(document.querySelector(".worksheet-center-guide--horizontal")).toBeTruthy();
    fireEvent.pointerUp(text, { clientX: 220, clientY: 310, pointerId: 2 });
    expect(onLayoutChange).toHaveBeenLastCalledWith("text", { x: 40, y: 45 });
    expect(document.querySelector(".worksheet-center-guide")).toBeNull();

    text.focus();
    await user.keyboard("{ArrowRight}");
    expect(onLayoutChange).toHaveBeenLastCalledWith("text", { x: 11, y: 10 });
  });

  it("offers selection actions and a direct resize handle without changing a locked object", () => {
    const onLayoutChange = vi.fn();
    const onLayerChange = vi.fn();
    const onSetBackground = vi.fn();
    render(
      <WorksheetDocumentRenderer
        document={freeformDocument()}
        onDeleteBlock={vi.fn()}
        onDuplicateBlock={vi.fn()}
        onLayerChange={onLayerChange}
        onLayoutChange={onLayoutChange}
        onMoveBlock={vi.fn()}
        onSelectBlock={vi.fn()}
        onSetBackground={onSetBackground}
        selectedBlockId="text"
      />
    );
    setPaperBounds();

    expect(screen.getByRole("button", { name: "Resize selected block" })).toBeVisible();
    fireEvent.pointerDown(screen.getByRole("button", { name: "Resize selected block" }), {
      clientX: 100,
      clientY: 100,
      pointerId: 4,
    });
    fireEvent.pointerUp(screen.getByRole("button", { name: "Resize selected block" }), {
      clientX: 180,
      clientY: 220,
      pointerId: 4,
    });
    expect(onLayoutChange).toHaveBeenLastCalledWith("text", { width: 40, height: 30 });
    fireEvent.click(screen.getByRole("button", { name: "Bring Forward" }));
    fireEvent.click(screen.getByRole("button", { name: "Send Backward" }));
    expect(onLayerChange).toHaveBeenNthCalledWith(1, "text", "forward");
    expect(onLayerChange).toHaveBeenNthCalledWith(2, "text", "backward");

    expect(screen.getByRole("button", { name: "Lock" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Lock" }));
    expect(onLayoutChange).toHaveBeenLastCalledWith("text", { locked: true });
  });

  it("keeps Preview and Session freeform renderings free of Builder chrome", () => {
    const worksheetDocument = freeformDocument();
    const { rerender } = render(
      <WorksheetDocumentRenderer document={worksheetDocument} />
    );

    const previewPaper = screen.getByRole("article", { name: "Freeform Page" });
    expect(previewPaper).toHaveClass("worksheet-paper--freeform");
    expect(
      screen.getByText("Name this part").closest(".worksheet-block-shell")
    ).toHaveStyle({
      left: "10%",
      top: "10%",
      width: "20%",
      height: "10%",
      zIndex: "3",
    });
    expect(screen.queryByLabelText("Resize selected block")).toBeNull();
    expect(document.querySelector(".worksheet-center-guide")).toBeNull();
    expect(screen.queryByLabelText("Block Actions")).toBeNull();

    rerender(<WorksheetDocumentRenderer document={worksheetDocument} interactive />);
    expect(
      screen.getByRole("textbox", { name: "Response for What do you notice?" })
    ).toBeVisible();
    expect(screen.queryByLabelText("Resize selected block")).toBeNull();
    expect(document.querySelector(".worksheet-center-guide")).toBeNull();
    expect(screen.queryByLabelText("Block Actions")).toBeNull();
  });

  it("duplicates and deletes the selected freeform block with safe keyboard shortcuts", async () => {
    const user = userEvent.setup();
    const onDeleteBlock = vi.fn();
    const onDuplicateBlock = vi.fn();
    render(
      <WorksheetDocumentRenderer
        document={freeformDocument()}
        interactive
        onDeleteBlock={onDeleteBlock}
        onDuplicateBlock={onDuplicateBlock}
        onSelectBlock={vi.fn()}
        selectedBlockId="text"
      />
    );

    await user.keyboard("{Meta>}d{/Meta}");
    expect(onDuplicateBlock).toHaveBeenCalledWith("text");
    await user.keyboard("{Delete}");
    expect(onDeleteBlock).toHaveBeenCalledWith("text");

    const response = screen.getByRole("textbox", {
      name: "Response for What do you notice?",
    });
    response.focus();
    await user.keyboard("{Meta>}d{/Meta}{Backspace}");
    expect(onDuplicateBlock).toHaveBeenCalledTimes(1);
    expect(onDeleteBlock).toHaveBeenCalledTimes(1);
  });
});
