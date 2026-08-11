import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import PromptDeckPage from "./PromptDeckPage";

const decks = [
  {
    id: "check-in",
    title: "Check In",
    color: "#3267A8",
    iconId: "ideas",
    prompts: [
      { id: "one", text: "First question" },
      { id: "two", text: "Second question" },
      { id: "three", text: "Third question" },
    ],
  },
  {
    id: "empty",
    title: "Empty Deck",
    prompts: [],
  },
];

const emptyMemory = (resourceId) => ({
  resourceId,
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
});

const privateMemory = (resourceId) => ({
  ...emptyMemory(resourceId),
  favorite: true,
  rating: 4,
  therapistNotes: "Do not show during screen sharing",
  worksWellWhen: ["Needs a gentle start"],
});

function memoryRepository() {
  return {
    getResourceMemory: vi.fn(async (id) => emptyMemory(id)),
    markResourceUsed: vi.fn(async (id) => ({ ...emptyMemory(id), useCount: 1 })),
  };
}

function renderDeckPage(path, suppliedDecks = decks, memory = memoryRepository()) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          element={<PromptDeckPage decks={suppliedDecks} memoryRepository={memory} />}
          path="/prompts/:deckId"
        />
        <Route element={<h1>Prompt Library Home</h1>} path="/prompts" />
      </Routes>
    </MemoryRouter>
  );
}

function seededRepositories(seedDecks) {
  return {
    decks: {
      getAllPromptDecks: vi.fn(async () => seedDecks),
      updatePromptDeck: vi.fn(async () => undefined),
      addPrompt: vi.fn(async () => undefined),
      bulkAddPrompts: vi.fn(async () => undefined),
      updatePrompt: vi.fn(async () => undefined),
      duplicatePrompt: vi.fn(async () => undefined),
      deletePrompt: vi.fn(async () => undefined),
      reorderPrompts: vi.fn(async () => undefined),
      movePrompt: vi.fn(async () => undefined),
      copyPrompt: vi.fn(async () => undefined),
    },
    categories: { getAllCategories: vi.fn(async () => []) },
    playlists: {
      getAllPlaylists: vi.fn(async () => []),
      addPlaylistItem: vi.fn(async () => undefined),
    },
  };
}

function renderSeededDeckPage(path, repositories, memory = memoryRepository()) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          element={
            <PromptDeckPage memoryRepository={memory} repositories={repositories} />
          }
          path="/prompts/:deckId"
        />
        <Route element={<h1>Prompt Library Home</h1>} path="/prompts" />
      </Routes>
    </MemoryRouter>
  );
}

describe("PromptDeckPage", () => {
  it("opens a deck at its direct route and shows one prompt", async () => {
    const memory = memoryRepository();
    render(renderDeckPage("/prompts/check-in", decks, memory));

    expect(screen.getByText("First question")).toBeVisible();
    const header = document.querySelector(".prompt-deck-page__header");
    expect(header).toHaveStyle({
      "--prompt-identity-color": "#3267A8",
      "--prompt-identity-soft": "#3267A81F",
    });
    expect(await screen.findAllByRole("img", { name: "Ideas" })).toHaveLength(2);
    expect(screen.queryByText("Second question")).toBeNull();
    expect(screen.getByText("1 of 3")).toBeVisible();
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(memory.markResourceUsed).toHaveBeenCalledTimes(1);
  });

  it("shows a card visual override in the Prompt session", async () => {
    const overridden = [
      {
        ...decks[0],
        prompts: [
          {
            ...decks[0].prompts[0],
            iconId: "curated-school-work-study01",
          },
        ],
      },
    ];
    render(renderDeckPage("/prompts/check-in", overridden));

    const stage = document.querySelector(".prompt-session__stage");
    expect(await within(stage).findByRole("img", { name: "Study01" })).toBeVisible();
    expect(within(stage).queryByRole("img", { name: "Ideas" })).toBeNull();
  });

  it("counts one meaningful use per newly entered session", async () => {
    const user = userEvent.setup();
    const memory = memoryRepository();
    render(renderDeckPage("/prompts/check-in", decks, memory));

    await screen.findByText("First question");
    expect(memory.markResourceUsed).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: /^next/i }));
    expect(memory.markResourceUsed).toHaveBeenCalledTimes(1);
  });

  it("keeps therapist Resource Memory outside the child-facing session by default", async () => {
    const user = userEvent.setup();
    const memory = memoryRepository();
    memory.getResourceMemory.mockImplementation(async (id) => privateMemory(id));
    render(renderDeckPage("/prompts/check-in", decks, memory));

    expect(screen.getByText("First question")).toBeVisible();
    expect(screen.queryByText("Do not show during screen sharing")).toBeNull();
    expect(screen.queryByRole("button", { name: "Favorite" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Rate 4 out of 5" })).toBeNull();

    const disclosure = screen.getByRole("button", {
      name: "Therapist Resource Memory",
    });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    await user.click(disclosure);
    expect(await screen.findByRole("button", { name: "Favorite" })).toBeVisible();
    expect(screen.queryByText("Do not show during screen sharing")).toBeNull();

    await user.click(screen.getByRole("button", { name: /private resource memory/i }));
    expect(screen.getByLabelText("Private Notes")).toHaveValue(
      "Do not show during screen sharing"
    );
    await user.click(
      screen.getByRole("button", { name: "Hide Therapist Resource Memory" })
    );
    expect(screen.queryByText("Do not show during screen sharing")).toBeNull();
    expect(screen.getByText("First question")).toBeVisible();
  });

  it("moves next and previous and updates the position", async () => {
    const user = userEvent.setup();
    render(renderDeckPage("/prompts/check-in"));

    await user.click(screen.getByRole("button", { name: /^next/i }));
    expect(screen.getByText("Second question")).toBeVisible();
    expect(screen.getByText("2 of 3")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(screen.getByText("First question")).toBeVisible();
    expect(screen.getByText("1 of 3")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^next/i }));
    await user.click(screen.getByRole("button", { name: /^next/i }));
    expect(screen.getByText("Third question")).toBeVisible();
    expect(screen.getByRole("button", { name: /^next/i })).toBeDisabled();
  });

  it("keeps one shuffled order while navigating and restart returns to its start", async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, "random").mockReturnValue(0);
    render(renderDeckPage("/prompts/check-in"));

    await user.click(screen.getByRole("button", { name: /shuffle/i }));
    const shuffledFirst = screen.getByText(/question$/).textContent;
    await user.click(screen.getByRole("button", { name: /^next/i }));
    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(screen.getByText(shuffledFirst)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^next/i }));
    await user.click(screen.getByRole("button", { name: /restart/i }));
    expect(screen.getByText(shuffledFirst)).toBeVisible();
    expect(screen.getByText("1 of 3")).toBeVisible();
    vi.restoreAllMocks();
  });

  it("handles an unknown deck without leaving the app route", () => {
    render(renderDeckPage("/prompts/missing"));

    expect(
      screen.getByRole("heading", { name: /couldn’t find that prompt deck/i })
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /back to prompt library/i })).toHaveAttribute(
      "href",
      "/prompts"
    );
  });

  it("handles an empty deck safely", () => {
    render(renderDeckPage("/prompts/empty"));

    expect(screen.getByText(/does not contain any prompts yet/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /^next/i })).toBeNull();
  });

  it("returns to the Prompt Library", async () => {
    const user = userEvent.setup();
    render(renderDeckPage("/prompts/check-in"));

    await user.click(screen.getByRole("link", { name: /back to prompt library/i }));
    expect(screen.getByRole("heading", { name: "Prompt Library Home" })).toBeVisible();
  });

  it("keeps Manage Deck visible before setup and presents focused guidance", async () => {
    const user = userEvent.setup();
    render(renderDeckPage("/prompts/check-in"));

    expect(screen.getByText("First question")).toBeVisible();
    const manageDeck = screen.getByRole("button", { name: /manage deck/i });
    expect(manageDeck.closest("header")).toHaveTextContent("Check In");
    await user.click(manageDeck);
    const guidance = screen.getByRole("heading", { name: /set up authoring first/i });
    expect(guidance).toBeVisible();
    expect(guidance.closest("section")).toHaveFocus();
    expect(
      screen.getByRole("link", { name: /set up in prompt library/i })
    ).toHaveAttribute("href", "/prompts");
    expect(screen.getByText("First question")).toBeVisible();
  });

  it("opens the existing manage view from a seeded routed deck", async () => {
    const user = userEvent.setup();
    const editableDeck = {
      ...decks[0],
      description: "Opening questions",
      category: "Connection",
      categoryId: null,
      color: "#6C46C3",
      iconId: "prompt-default",
      diagnoses: [],
      goals: [],
      ageRanges: [],
      tags: [],
      archived: false,
      prompts: decks[0].prompts.map((prompt, sortOrder) => ({
        ...prompt,
        diagnoses: [],
        goals: [],
        ageRanges: [],
        tags: [],
        sortOrder,
      })),
    };
    const repositories = seededRepositories([editableDeck]);
    renderSeededDeckPage("/prompts/check-in", repositories);

    await user.click(await screen.findByRole("button", { name: /manage deck/i }));
    expect(screen.getByRole("region", { name: /manage deck/i })).toHaveFocus();
    expect(screen.getByRole("button", { name: /edit deck title/i })).toBeVisible();
    expect(screen.getAllByRole("button", { name: /edit prompt text/i })).toHaveLength(3);
    expect(screen.getByRole("group", { name: /deck color/i })).toBeVisible();
    expect(screen.getByRole("group", { name: /deck icon/i })).toBeVisible();
    expect(screen.getByRole("combobox", { name: /^category$/i })).toBeVisible();
    expect(screen.queryByRole("button", { name: /save metadata/i })).toBeNull();
    expect(screen.getByRole("button", { name: /^add prompt$/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /review complete/i })).toBeVisible();
    expect(screen.queryByRole("button", { name: /^duplicate$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^delete$/i })).toBeNull();

    await user.click(screen.getByRole("button", { name: /show clinical metadata/i }));
    expect(screen.getByRole("button", { name: /save metadata/i })).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: /show options for first question/i })
    );
    expect(screen.getAllByRole("button", { name: /save metadata/i })).toHaveLength(2);
    expect(screen.getByRole("button", { name: /^duplicate$/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeVisible();
  });
});
