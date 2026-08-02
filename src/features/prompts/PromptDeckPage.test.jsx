import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import PromptDeckPage from "./PromptDeckPage";

const decks = [
  {
    id: "check-in",
    title: "Check In",
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

function renderDeckPage(path, suppliedDecks = decks) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          element={<PromptDeckPage decks={suppliedDecks} />}
          path="/prompts/:deckId"
        />
        <Route element={<h1>Prompt Library Home</h1>} path="/prompts" />
      </Routes>
    </MemoryRouter>
  );
}

describe("PromptDeckPage", () => {
  it("opens a deck at its direct route and shows one prompt", () => {
    render(renderDeckPage("/prompts/check-in"));

    expect(screen.getByText("First question")).toBeVisible();
    expect(screen.queryByText("Second question")).toBeNull();
    expect(screen.getByText("1 of 3")).toBeVisible();
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
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
});
