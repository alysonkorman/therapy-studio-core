import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import SavedPage from "./SavedPage";

const deck = {
  id: "1",
  type: "prompt-deck",
  title: "Check In",
  description: "Opening questions",
  category: "Connection",
  prompts: [{ id: "p1", text: "How are you?" }],
};
const memory = {
  resourceId: "1",
  createdAt: "2026-08-04T12:00:00.000Z",
  updatedAt: "2026-08-04T12:00:00.000Z",
  favorite: true,
  rating: 5,
  useCount: 2,
  lastUsedAt: "2026-08-04T12:00:00.000Z",
  therapistNotes: "",
  worksWellWhen: [],
  kidsWhoUsuallyLikeThis: [],
  adaptations: [],
};

describe("SavedPage", () => {
  it("renders all deterministic Resource Memory collections", async () => {
    const item = { memory, resource: deck };
    const repository = {
      getFavoriteResources: vi.fn(async () => [item]),
      getRecentlyUsedResources: vi.fn(async () => [item]),
      getMostUsedResources: vi.fn(async () => [item]),
      getHighestRatedResources: vi.fn(async () => [item]),
      getResourceMemory: vi.fn(async () => memory),
    };
    render(
      <MemoryRouter>
        <SavedPage repository={repository} />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Favorites" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Recently Used" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Most Used" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Highest Rated" })).toBeVisible();
    expect(screen.getAllByRole("heading", { name: "Check In" })).toHaveLength(4);
  });
});
