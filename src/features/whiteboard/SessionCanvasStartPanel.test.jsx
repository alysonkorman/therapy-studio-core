import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { sessionCanvasTemplates } from "../../data/sessionCanvasTemplates";
import SessionCanvasStartPanel from "./SessionCanvasStartPanel";

describe("SessionCanvasStartPanel", () => {
  it("offers every starter through a one-click Use Now action", async () => {
    const user = userEvent.setup();
    const onUse = vi.fn();
    render(<SessionCanvasStartPanel onUse={onUse} templates={sessionCanvasTemplates} />);
    expect(screen.getAllByRole("article")).toHaveLength(3);
    await user.click(
      screen.getByRole("button", { name: "Use Now: Feelings Thermometer" })
    );
    expect(onUse).toHaveBeenCalledWith(sessionCanvasTemplates[0]);
  });
});
