import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { generalKnowledgeTrivia } from "../../data/resources";
import { renderWithRouter } from "../../test/test-utils";
import TriviaGamePage from "./TriviaGamePage";

const memory = {
  resourceId: generalKnowledgeTrivia.id,
  favorite: false,
  rating: null,
  useCount: 0,
  lastUsedAt: null,
  therapistNotes: "",
  worksWellWhen: [],
  kidsWhoUsuallyLikeThis: [],
  adaptations: [],
  createdAt: "2026-08-11T12:00:00.000Z",
  updatedAt: "2026-08-11T12:00:00.000Z",
};

describe("TriviaGamePage", () => {
  it("opens a valid set and marks use at first answer reveal, not page opening", async () => {
    const user = userEvent.setup();
    const repository = {
      getResourceMemory: vi.fn(async () => memory),
      markResourceUsed: vi.fn(async () => ({ ...memory, useCount: 1 })),
    };
    renderWithRouter(
      <TriviaGamePage gameId={generalKnowledgeTrivia.id} memoryRepository={repository} />
    );

    expect(
      screen.getByRole("heading", { name: generalKnowledgeTrivia.title })
    ).toBeVisible();
    expect(repository.markResourceUsed).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Reveal Answer" }));
    expect(repository.markResourceUsed).toHaveBeenCalledWith(generalKnowledgeTrivia.id);
  });

  it("reopens a persisted Trivia Set", async () => {
    const saved = {
      ...generalKnowledgeTrivia,
      id: "saved-trivia",
      title: "Saved Trivia",
      archived: false,
    };
    renderWithRouter(
      <TriviaGamePage
        gameId={saved.id}
        memoryRepository={{
          getResourceMemory: vi.fn(async () => ({ ...memory, resourceId: saved.id })),
        }}
        repository={{ getResourceById: vi.fn(async () => saved) }}
        starters={[]}
      />
    );

    expect(await screen.findByRole("heading", { name: "Saved Trivia" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Reveal Answer" })).toBeVisible();
  });

  it("shows in-shell recovery for an unknown set", async () => {
    renderWithRouter(
      <TriviaGamePage
        gameId="missing"
        repository={{ getResourceById: vi.fn().mockRejectedValue(new Error("missing")) }}
        starters={[]}
      />
    );
    expect(
      await screen.findByRole("heading", { name: "We Couldn’t Find That Trivia Set" })
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to Games" })).toHaveAttribute(
      "href",
      "/games"
    );
  });
});
