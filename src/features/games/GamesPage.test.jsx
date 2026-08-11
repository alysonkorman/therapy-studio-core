import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { generalKnowledgeTrivia } from "../../data/resources";
import { renderWithRouter } from "../../test/test-utils";
import GamesPage from "./GamesPage";

describe("Games Library", () => {
  it("renders the starter and persisted Trivia Sets with playable destinations", async () => {
    const saved = { ...generalKnowledgeTrivia, id: "saved-trivia", title: "My Trivia" };
    renderWithRouter(
      <GamesPage repository={{ getAllResources: vi.fn(async () => [saved]) }} />
    );

    expect(
      await screen.findByRole("heading", { name: "Curious Minds Trivia" })
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "My Trivia" })).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: "Play Trivia", exact: true })[0]
    ).toHaveAttribute("href", "/games/game-starter-general-knowledge-trivia");
    expect(screen.queryByText("Coming soon.")).toBeNull();
  });
});
