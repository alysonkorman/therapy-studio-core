import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { generalKnowledgeTrivia, pictureWordBingo } from "../../data/resources";
import { renderWithRouter } from "../../test/test-utils";
import GamesPage from "./GamesPage";

describe("Games Library", () => {
  it("offers the real Whiteboard tool without treating it as Trivia", async () => {
    renderWithRouter(
      <GamesPage
        bingoDataRepository={{ getAllBingoSets: vi.fn(async () => []) }}
        repository={{ getAllTriviaSets: vi.fn(async () => []) }}
      />
    );
    expect(await screen.findByRole("heading", { name: "Whiteboard" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Open Whiteboard" })).toHaveAttribute(
      "href",
      "/whiteboard"
    );
  });

  it("renders the starter and persisted Trivia Sets with playable destinations", async () => {
    const saved = { ...generalKnowledgeTrivia, id: "saved-trivia", title: "My Trivia" };
    renderWithRouter(
      <GamesPage
        bingoDataRepository={{ getAllBingoSets: vi.fn(async () => []) }}
        repository={{
          getAllTriviaSets: vi.fn(async () => [
            { ...generalKnowledgeTrivia, starter: true },
            { ...saved, starter: false },
          ]),
        }}
      />
    );

    expect(
      await screen.findByRole("heading", { name: "Curious Minds Trivia" })
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "My Trivia" })).toBeVisible();
    expect(
      screen
        .getAllByRole("link", { name: "Play Trivia", exact: true })
        .map((link) => link.getAttribute("href"))
    ).toContain("/games/game-starter-general-knowledge-trivia");
    expect(screen.queryByText("Coming soon.")).toBeNull();
  });

  it("offers import and exports only therapist-owned Trivia Sets", async () => {
    const user = userEvent.setup();
    const saved = { ...generalKnowledgeTrivia, id: "saved-trivia", title: "My Trivia" };
    const onExport = vi.fn();
    renderWithRouter(
      <GamesPage
        bingoDataRepository={{ getAllBingoSets: vi.fn(async () => []) }}
        onExport={onExport}
        repository={{
          getAllTriviaSets: vi.fn(async () => [
            { ...generalKnowledgeTrivia, starter: true },
            { ...saved, starter: false },
          ]),
        }}
      />
    );

    await screen.findByRole("heading", { name: "My Trivia" });
    expect(screen.getAllByRole("button", { name: "Export JSON" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Export JSON" }));
    expect(onExport).toHaveBeenCalledWith(expect.objectContaining({ id: saved.id }));
    await user.click(screen.getByRole("button", { name: "Import Trivia" }));
    expect(screen.getByRole("heading", { name: "Import Trivia" })).toBeVisible();
  });

  it("renders Bingo as a distinct playable Game", async () => {
    renderWithRouter(
      <GamesPage
        bingoDataRepository={{
          getAllBingoSets: vi.fn(async () => [{ ...pictureWordBingo, starter: true }]),
        }}
        repository={{ getAllTriviaSets: vi.fn(async () => []) }}
      />
    );

    expect(
      await screen.findByRole("heading", { name: pictureWordBingo.title })
    ).toBeVisible();
    expect(screen.getByText("Bingo")).toBeVisible();
    expect(screen.getByText("32")).toBeVisible();
    expect(screen.getByRole("link", { name: "Play Bingo" })).toHaveAttribute(
      "href",
      `/games/${pictureWordBingo.id}`
    );
    expect(screen.queryByRole("link", { name: "Manage" })).toBeNull();
  });
});
