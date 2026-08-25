import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { generalKnowledgeTrivia, pictureWordBingo } from "../../data/resources";
import { renderWithRouter } from "../../test/test-utils";
import GamePage from "./GamePage";

const memory = {
  resourceId: pictureWordBingo.id,
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

describe("GamePage", () => {
  it("opens Bingo and marks meaningful use only after the first square mark", async () => {
    const user = userEvent.setup();
    const memoryRepository = {
      getResourceMemory: vi.fn(async () => memory),
      markResourceUsed: vi.fn(async () => ({ ...memory, useCount: 1 })),
    };
    renderWithRouter(
      <GamePage gameId={pictureWordBingo.id} memoryRepository={memoryRepository} />
    );
    expect(screen.getByRole("heading", { name: pictureWordBingo.title })).toBeVisible();
    expect(memoryRepository.markResourceUsed).not.toHaveBeenCalled();
    await user.click(screen.getAllByRole("button", { name: /^Mark / })[0]);
    expect(memoryRepository.markResourceUsed).toHaveBeenCalledWith(pictureWordBingo.id);
  });

  it("continues to dispatch Trivia through the existing session", () => {
    renderWithRouter(
      <GamePage
        gameId={generalKnowledgeTrivia.id}
        memoryRepository={{
          getResourceMemory: vi.fn(async () => ({
            ...memory,
            resourceId: generalKnowledgeTrivia.id,
          })),
        }}
      />
    );
    expect(screen.getByRole("button", { name: "Reveal Answer" })).toBeVisible();
  });

  it("rejects unknown IDs and persisted resources of unsupported kinds", async () => {
    renderWithRouter(
      <GamePage
        gameId="wrong-kind"
        repository={{
          getResourceById: vi.fn(async () => ({
            ...pictureWordBingo,
            gameKind: "unsupported",
            archived: false,
          })),
        }}
        starterGames={[]}
      />
    );
    expect(
      await screen.findByRole("heading", { name: "We Couldn’t Find That Game" })
    ).toBeVisible();
  });
});
