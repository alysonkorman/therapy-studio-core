import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ParticipantStickerPicker from "./ParticipantStickerPicker";

describe("ParticipantStickerPicker", () => {
  it("offers child-friendly categories and returns only the selected semantic icon ID", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<ParticipantStickerPicker onChoose={onChoose} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Choose a sticker" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Animals" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Animals" }));

    const sticker = screen.getAllByRole("button", { name: /add .+ sticker/i })[0];
    await user.click(sticker);

    expect(onChoose).toHaveBeenCalledWith(expect.any(String));
    expect(onChoose.mock.calls[0][0]).not.toMatch(/[\\/]/);
  });
});
