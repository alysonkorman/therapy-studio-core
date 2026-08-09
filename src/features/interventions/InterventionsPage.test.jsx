import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createDefaultResourceMemory } from "../../models";
import { renderWithRouter } from "../../test/test-utils";
import InterventionsPage from "./InterventionsPage";

const NOW = "2026-08-09T12:00:00.000Z";

function memoryRepository() {
  return {
    getResourceMemory: vi.fn(async (id) => createDefaultResourceMemory(id, NOW)),
    toggleFavorite: vi.fn(async (id) => ({
      ...createDefaultResourceMemory(id, NOW),
      favorite: true,
    })),
    setRating: vi.fn(),
    clearRating: vi.fn(),
  };
}

describe("InterventionsPage", () => {
  it("renders the complete internally authored starter library", async () => {
    renderWithRouter(<InterventionsPage memoryRepository={memoryRepository()} />);

    expect(screen.getByText("8 Interventions")).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Open Intervention" })).toHaveLength(8);
    expect(screen.getByRole("heading", { name: "Feelings Jenga" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Problem-Solving Steps" })).toBeVisible();
  });

  it("searches and combines lightweight filters", async () => {
    const user = userEvent.setup();
    renderWithRouter(<InterventionsPage memoryRepository={memoryRepository()} />);

    await user.type(
      screen.getByRole("searchbox", { name: "Search Interventions" }),
      "body clues"
    );
    expect(screen.getByText("1 Intervention")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Body Clues Check-In" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Clear Filters" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Goal or Topic" }),
      "Emotion identification"
    );
    await user.selectOptions(screen.getByRole("combobox", { name: "Age Fit" }), "5–7");
    await user.selectOptions(screen.getByRole("combobox", { name: "Duration" }), "10");
    expect(screen.getByText("2 Interventions")).toBeVisible();
  });

  it("uses shared Resource Memory for favorites", async () => {
    const user = userEvent.setup();
    const repository = memoryRepository();
    renderWithRouter(<InterventionsPage memoryRepository={repository} />);

    const card = screen
      .getByRole("heading", { name: "Feelings Jenga" })
      .closest("article");
    await user.click(await within(card).findByRole("button", { name: "Add Favorite" }));

    expect(repository.toggleFavorite).toHaveBeenCalledWith("intervention-feelings-jenga");
  });
});
