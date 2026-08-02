import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { promptDecks } from "../../data/resources";
import { renderWithRouter } from "../../test/test-utils";
import PromptsPage from "./PromptsPage";

const testDecks = [
  {
    id: "feelings",
    title: "Feelings Check-In",
    description: "Notice emotions and body clues.",
    category: "Emotions",
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

describe("PromptsPage", () => {
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
