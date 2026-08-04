import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { promptDecks } from "../../data/resources";
import { renderWithRouter } from "../../test/test-utils";
import PromptsPage from "./PromptsPage";

const testDecks = [
  {
    id: "feelings",
    title: "Feelings Check-In",
    description: "Notice emotions and body clues.",
    category: "Emotions",
    color: "#3267A8",
    iconId: "ideas",
    tags: ["awareness"],
    prompts: [
      { id: "one", text: "Where do you notice worry in your body?" },
      { id: "two", text: "What feeling visited today?" },
    ],
  },
  {
    id: "strengths",
    title: "Everyday Superpowers",
    description: "",
    category: "Strengths",
    tags: ["confidence"],
    prompts: [{ id: "three", text: "What did you do that felt brave?" }],
  },
];

function authoringRepositories({
  seedFailure,
  seedDeferred,
  initiallySeeded = false,
} = {}) {
  let storedDecks = initiallySeeded ? promptDecks : [];
  let storedCategories = [];
  return {
    decks: {
      getAllPromptDecks: vi.fn(async () => storedDecks),
      seedImportedPromptDecks: vi.fn(async (decks) => {
        if (seedDeferred) await seedDeferred.promise;
        if (seedFailure) throw seedFailure;
        storedDecks = decks;
        return { created: decks.length, unchanged: 0, conflicts: [] };
      }),
    },
    categories: {
      getAllCategories: vi.fn(async () => storedCategories),
      seedCategories: vi.fn(async (categories) => {
        storedCategories = categories;
        return { inserted: categories.length, unchanged: 0, conflicts: [] };
      }),
    },
    playlists: {
      getAllPlaylists: vi.fn(async () => []),
    },
  };
}

describe("PromptsPage", () => {
  it("renders saved deck color and curated identity on library cards", async () => {
    renderWithRouter(<PromptsPage decks={testDecks} />);
    const card = screen
      .getByRole("heading", { name: "Feelings Check-In" })
      .closest("article");
    expect(card).toHaveStyle({ "--prompt-identity-color": "#3267A8" });
    expect(
      within(card).getByText("Emotions").closest(".prompt-deck-card__band")
    ).toHaveClass("prompt-deck-card__band");
    expect(await within(card).findByRole("img", { name: "Ideas" })).toBeVisible();
  });
  it("shows an immediately visible first-run setup while keeping the library usable", async () => {
    const repositories = authoringRepositories();
    renderWithRouter(<PromptsPage repositories={repositories} />, {
      initialEntries: ["/prompts"],
    });

    expect(
      await screen.findByRole("heading", { name: /set up prompt authoring/i })
    ).toBeVisible();
    expect(screen.getByText(/137 decks and 8,679 prompts/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: /set up prompt authoring/i })
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: /create deck/i })).toBeNull();
    expect(screen.getAllByRole("link", { name: /open deck/i })).toHaveLength(137);
  });

  it("moves from first-run setup to authoring without a reload", async () => {
    const user = userEvent.setup();
    let resolveSeed;
    const seedDeferred = {
      promise: new Promise((resolve) => {
        resolveSeed = resolve;
      }),
    };
    const repositories = authoringRepositories({ seedDeferred });
    renderWithRouter(<PromptsPage repositories={repositories} />, {
      initialEntries: ["/prompts"],
    });

    const setup = await screen.findByRole("button", {
      name: /set up prompt authoring/i,
    });
    await user.click(setup);
    expect(
      screen.getByRole("button", { name: /setting up prompt authoring/i })
    ).toBeDisabled();
    expect(screen.getByText(/preparing your editable prompt library/i)).toBeVisible();

    resolveSeed();
    expect(await screen.findByText(/manage prompt library/i)).toBeVisible();
    expect(repositories.decks.seedImportedPromptDecks).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("heading", { name: /set up prompt authoring/i })
    ).toBeNull();

    expect(screen.getByRole("button", { name: /new deck/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /new category/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /new playlist/i })).toBeVisible();
    await user.click(screen.getByText(/manage prompt library/i));
    expect(screen.getByRole("heading", { name: /^categories$/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /^playlists$/i })).toBeVisible();
  });

  it("keeps the static library and permits retry when setup fails", async () => {
    const user = userEvent.setup();
    const repositories = authoringRepositories({
      seedFailure: new Error("Storage failed"),
    });
    renderWithRouter(<PromptsPage repositories={repositories} />);

    const setup = await screen.findByRole("button", { name: /set up prompt authoring/i });
    await user.click(setup);
    expect(await screen.findByRole("alert")).toHaveTextContent(/still available/i);
    expect(screen.getByRole("alert")).not.toHaveTextContent(/indexeddb|dexie|database/i);
    expect(screen.getAllByRole("link", { name: /open deck/i })).toHaveLength(137);
    expect(
      screen.getByRole("button", { name: /set up prompt authoring/i })
    ).toBeEnabled();
  });

  it("restores authoring controls from an already-seeded repository", async () => {
    const repositories = authoringRepositories({ initiallySeeded: true });
    renderWithRouter(<PromptsPage repositories={repositories} />);

    expect(await screen.findByText(/manage prompt library/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /set up prompt authoring/i })).toBeNull();
    expect(repositories.decks.seedImportedPromptDecks).not.toHaveBeenCalled();
  });

  it("renders all imported decks and their represented prompt count", () => {
    renderWithRouter(<PromptsPage decks={promptDecks} />, {
      initialEntries: ["/prompts"],
    });

    expect(screen.getByText(/137 decks with 8,679 prompts/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /open deck/i })).toHaveLength(137);
  });

  it("searches title and contained prompt text", async () => {
    const user = userEvent.setup();
    renderWithRouter(<PromptsPage decks={testDecks} />);
    const search = screen.getByRole("searchbox", { name: /search prompts/i });

    await user.type(search, "Superpowers");
    expect(screen.getByRole("heading", { name: "Everyday Superpowers" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Feelings Check-In" })).toBeNull();

    await user.clear(search);
    await user.type(search, "notice worry");
    expect(screen.getByRole("heading", { name: "Feelings Check-In" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Everyday Superpowers" })).toBeNull();
  });

  it("submits with Enter without clearing the query or category", async () => {
    const user = userEvent.setup();
    renderWithRouter(<PromptsPage decks={testDecks} />, {
      initialEntries: ["/prompts"],
    });
    const search = screen.getByRole("searchbox", { name: /search prompts/i });
    const category = screen.getByRole("combobox", { name: /category/i });

    await user.selectOptions(category, "Strengths");
    await user.type(search, "brave{Enter}");

    expect(screen.getByText("Showing 1 of 2 decks")).toBeVisible();
    expect(search).toHaveValue("brave");
    expect(category).toHaveValue("Strengths");
    expect(screen.getByRole("form", { name: /search prompt decks/i })).toBeVisible();
  });

  it("submits with the Search button and preserves the query", async () => {
    const user = userEvent.setup();
    renderWithRouter(<PromptsPage decks={testDecks} />);
    const search = screen.getByRole("searchbox", { name: /search prompts/i });

    await user.type(search, "Superpowers");
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    expect(screen.getByText("Showing 1 of 2 decks")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Everyday Superpowers" })).toBeVisible();
    expect(search).toHaveValue("Superpowers");
  });

  it("filters by category and clears all results controls", async () => {
    const user = userEvent.setup();
    renderWithRouter(<PromptsPage decks={testDecks} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: /category/i }),
      "Strengths"
    );
    await user.type(screen.getByRole("searchbox", { name: /search prompts/i }), "brave");

    expect(screen.getByText("Showing 1 of 2 decks")).toBeVisible();
    await user.click(screen.getByRole("button", { name: /clear results/i }));
    expect(screen.getByText("Showing 2 of 2 decks")).toBeVisible();
    expect(screen.getByRole("searchbox", { name: /search prompts/i })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: /category/i })).toHaveValue("");
  });

  it("shows a clear empty state when nothing matches", async () => {
    const user = userEvent.setup();
    renderWithRouter(<PromptsPage decks={testDecks} />);

    await user.type(
      screen.getByRole("searchbox", { name: /search prompts/i }),
      "no possible match"
    );

    expect(screen.getByRole("heading", { name: /no prompt decks match/i })).toBeVisible();
  });
});
