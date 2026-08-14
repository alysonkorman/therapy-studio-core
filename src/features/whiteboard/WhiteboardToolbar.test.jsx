import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import WhiteboardToolbar from "./WhiteboardToolbar";

function renderToolbar(options = {}) {
  const onToolChange = vi.fn();
  render(
    <WhiteboardToolbar
      onRedo={vi.fn()}
      onShowActivity={vi.fn()}
      onShowIcons={vi.fn()}
      onToolChange={onToolChange}
      onUndo={vi.fn()}
      participantMode
      tool="draw"
      {...options}
    />
  );
  return { onToolChange };
}

describe("WhiteboardToolbar live participant presets", () => {
  it("shows a simplified, touch-friendly young-child tool set", () => {
    renderToolbar({ participantPreset: "young" });

    expect(screen.getByRole("button", { name: "Draw" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Move" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Rectangle" })).toBeVisible();
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
    await user.click(screen.getByRole("button", { name: "Draw" }));
    expect(onToolChange).toHaveBeenCalledWith("draw");
  });
});
