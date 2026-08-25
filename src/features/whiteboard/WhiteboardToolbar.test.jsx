import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import WhiteboardToolbar from "./WhiteboardToolbar";

function renderToolbar(options = {}) {
  const onToolChange = vi.fn();
  const onUndo = vi.fn();
  const onShowStickers = vi.fn();
  render(
    <WhiteboardToolbar
      color="#28252C"
      colors={["#28252C", "#B14C4C"]}
      onColorChange={vi.fn()}
      onShowActivity={vi.fn()}
      onShowIcons={vi.fn()}
      onShowStickers={onShowStickers}
      onToolChange={onToolChange}
      onUndo={onUndo}
      participantMode
      tool="draw"
      {...options}
    />
  );
  return { onShowStickers, onToolChange, onUndo };
}

describe("WhiteboardToolbar live participant presets", () => {
  it("shows a simplified, touch-friendly young-child tool set", () => {
    renderToolbar({ participantPreset: "young" });

    expect(screen.getByRole("button", { name: "Draw" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Move" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Shapes" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Stickers" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Colors" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Text" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Visual" })).toBeNull();
  });

  it("offers the older-child tools but never private import controls", () => {
    renderToolbar({ participantPreset: "older" });

    expect(screen.getByRole("button", { name: "Text" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Arrow" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Add Activity" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Visual" })).toBeNull();
  });

  it("enforces the draw-only participant surface", async () => {
    const user = userEvent.setup();
    const { onToolChange } = renderToolbar({ participantPermission: "draw-only" });

    expect(screen.getByRole("button", { name: "Draw" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Move" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Eraser" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Stickers" })).toBeNull();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Draw" }));
    expect(onToolChange).toHaveBeenCalledWith("draw");
  });

  it("uses direct visual color and shape pickers for young children", async () => {
    const user = userEvent.setup();
    const onColorChange = vi.fn();
    const { onToolChange } = renderToolbar({ onColorChange, participantPreset: "young" });

    await user.click(screen.getByRole("button", { name: "Colors" }));
    await user.click(screen.getByRole("button", { name: "Use color #B14C4C" }));
    expect(onColorChange).toHaveBeenCalledWith("#B14C4C");

    await user.click(screen.getByRole("button", { name: "Shapes" }));
    await user.click(screen.getByRole("button", { name: "Circle" }));
    expect(onToolChange).toHaveBeenCalledWith("ellipse");
  });

  it("keeps the color palette open for touch interactions and closes after a swatch", async () => {
    const user = userEvent.setup();
    const onColorChange = vi.fn();
    renderToolbar({ onColorChange, participantPreset: "young" });

    await user.click(screen.getByRole("button", { name: "Colors" }));
    const palette = screen.getByRole("group", { name: "Choose a color" });
    const swatch = screen.getByRole("button", { name: "Use color #B14C4C" });

    fireEvent.pointerDown(swatch, { pointerType: "touch" });
    expect(palette).toBeVisible();

    await user.click(swatch);
    expect(onColorChange).toHaveBeenCalledWith("#B14C4C");
    expect(screen.queryByRole("group", { name: "Choose a color" })).toBeNull();
  });

  it("closes the color palette outside its boundary or when another tool is chosen", async () => {
    const user = userEvent.setup();
    const { onToolChange } = renderToolbar({ participantPreset: "older" });

    await user.click(screen.getByRole("button", { name: "Colors" }));
    expect(screen.getByRole("group", { name: "Choose a color" })).toBeVisible();

    fireEvent.pointerDown(document.body, { pointerType: "touch" });
    expect(screen.queryByRole("group", { name: "Choose a color" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Colors" }));
    await user.click(screen.getByRole("button", { name: "Text" }));
    expect(onToolChange).toHaveBeenCalledWith("text");
    expect(screen.queryByRole("group", { name: "Choose a color" })).toBeNull();
  });
});
