import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ResourceMemoryControls from "./ResourceMemoryControls";

const baseMemory = {
  resourceId: "1",
  createdAt: "2026-08-04T12:00:00.000Z",
  updatedAt: "2026-08-04T12:00:00.000Z",
  favorite: false,
  rating: null,
  useCount: 0,
  lastUsedAt: null,
  therapistNotes: "",
  worksWellWhen: [],
  kidsWhoUsuallyLikeThis: [],
  adaptations: [],
};

function setupRepository() {
  let memory = { ...baseMemory };
  const update = (changes) => {
    memory = { ...memory, ...changes };
    return Promise.resolve(memory);
  };
  return {
    getResourceMemory: vi.fn(async () => memory),
    toggleFavorite: vi.fn(() => update({ favorite: !memory.favorite })),
    setRating: vi.fn((_id, rating) => update({ rating })),
    clearRating: vi.fn(() => update({ rating: null })),
    markResourceUsed: vi.fn(() => update({ useCount: 1 })),
    updateTherapistNotes: vi.fn((_id, value) => update({ therapistNotes: value })),
    updateWorksWellWhen: vi.fn((_id, value) => update({ worksWellWhen: value })),
    updateKidsWhoUsuallyLikeThis: vi.fn((_id, value) =>
      update({ kidsWhoUsuallyLikeThis: value })
    ),
    updateAdaptations: vi.fn((_id, value) => update({ adaptations: value })),
  };
}

describe("ResourceMemoryControls", () => {
  it("toggles favorite and sets and clears a rating", async () => {
    const user = userEvent.setup();
    const repository = setupRepository();
    render(<ResourceMemoryControls repository={repository} resourceId="1" />);

    await user.click(await screen.findByRole("button", { name: "Add Favorite" }));
    expect(repository.toggleFavorite).toHaveBeenCalledWith("1");
    await user.click(screen.getByRole("button", { name: "Rate 4 out of 5" }));
    expect(repository.setRating).toHaveBeenCalledWith("1", 4);
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(repository.clearRating).toHaveBeenCalledWith("1");
  });

  it("keeps private notes collapsed and saves line breaks explicitly", async () => {
    const user = userEvent.setup();
    const repository = setupRepository();
    render(<ResourceMemoryControls repository={repository} resourceId="1" showEditor />);

    const disclosure = await screen.findByRole("button", {
      name: /private resource memory/i,
    });
    expect(screen.getByLabelText("Private Notes")).not.toBeVisible();
    await user.click(disclosure);
    const notes = screen.getByLabelText("Private Notes");
    await user.type(notes, "First line{enter}Second line");
    await user.click(screen.getByRole("button", { name: "Save Notes" }));
    expect(repository.updateTherapistNotes).toHaveBeenCalledWith(
      "1",
      "First line\nSecond line"
    );
  });
});
