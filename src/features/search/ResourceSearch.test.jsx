import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { useCurrentSessionStore } from "../../stores/currentSessionStore";
import { renderWithRouter } from "../../test/test-utils";
import ResourceSearch from "./ResourceSearch";

const intervention = {
  id: "intervention-1",
  type: "intervention",
  title: "Feelings Jenga",
  description: "Identify and discuss emotions through play.",
  worksWellWhen: ["They're shutting down"],
  useWith: [],
  kidsWhoLike: ["Pokémon"],
  goals: ["Rapport"],
  diagnoses: [],
  ageRanges: [],
  settings: [],
  materials: ["Jenga blocks"],
  durationMinutes: 10,
  telehealthFriendly: true,
  source: "",
  research: [],
  myNotes: "",
  rating: null,
  favorite: false,
  usageCount: 0,
};

const promptDeck = {
  ...intervention,
  id: "deck-1",
  type: "prompt-deck",
  title: "Brave Questions",
  description: "Conversation starters.",
  category: "Strengths",
  tags: ["rapport"],
  prompts: [{ id: "prompt-1", text: "What is one brave thing you tried?" }],
};

const resources = [intervention, promptDeck];

describe("ResourceSearch", () => {
  beforeEach(() => useCurrentSessionStore.getState().clearContext());

  it("runs with Enter without reload and keeps the query visible", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ResourceSearch resources={resources} />);
    const input = screen.getByRole("searchbox", {
      name: /what do you need right now/i,
    });

    await user.type(input, "brave{Enter}");

    expect(input).toHaveValue("brave");
    expect(screen.getByText(/1 result for “brave”/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Brave Questions" })).toBeVisible();
  });

  it("prevents default form navigation", () => {
    renderWithRouter(<ResourceSearch resources={resources} />);
    expect(
      fireEvent.submit(screen.getByRole("form", { name: /search all resources/i }))
    ).toBe(false);
  });

  it("runs the same search from the Search button", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ResourceSearch resources={resources} />);
    const input = screen.getByRole("searchbox", {
      name: /what do you need right now/i,
    });

    await user.type(input, "Feelings Jenga");
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    expect(input).toHaveValue("Feelings Jenga");
    expect(screen.getByText(/2 results for “Feelings Jenga”/i)).toBeVisible();
    const resultRegions = screen.getAllByRole("region", { name: /search result:/i });
    expect(
      within(resultRegions[0]).getByRole("heading", { name: "Feelings Jenga" })
    ).toBeVisible();
  });

  it("runs suggested searches and renders interventions appropriately", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ResourceSearch resources={resources} />);

    await user.click(screen.getByRole("button", { name: "Pokémon" }));

    expect(screen.getByRole("searchbox")).toHaveValue("Pokémon");
    const interventionResult = screen.getByRole("region", {
      name: "Search result: Feelings Jenga",
    });
    expect(
      within(interventionResult).getByRole("heading", { name: "Feelings Jenga" })
    ).toBeVisible();
    expect(
      within(interventionResult).getByText("Matched resource details: Pokémon")
    ).toBeVisible();
  });

  it("shows ranked results and links prompt decks to their usable route", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ResourceSearch resources={resources} />);

    await user.type(screen.getByRole("searchbox"), "rapport{Enter}");

    const results = screen.getAllByRole("region", { name: /search result:/i });
    expect(results).toHaveLength(2);
    expect(
      within(results[0]).getByRole("heading", { name: "Brave Questions" })
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /open deck/i })).toHaveAttribute(
      "href",
      "/prompts/deck-1"
    );
  });

  it("shows an empty state", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ResourceSearch resources={resources} />);

    await user.type(screen.getByRole("searchbox"), "astronautical{Enter}");

    expect(screen.getByText(/0 results for “astronautical”/i)).toBeVisible();
    expect(
      screen.getByRole("heading", { name: /no resources match that search/i })
    ).toBeVisible();
  });

  it("clears the query and results", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ResourceSearch resources={resources} />);

    await user.type(screen.getByRole("searchbox"), "rapport{Enter}");
    await user.click(screen.getByRole("button", { name: /clear search/i }));

    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.queryByText(/results for/i)).toBeNull();
  });

  it("renders and removes transparent Current Session explanations", async () => {
    const user = userEvent.setup();
    useCurrentSessionStore.getState().updateField("interests", "Pokémon");
    renderWithRouter(<ResourceSearch resources={resources} />);

    await user.type(screen.getByRole("searchbox"), "rapport{Enter}");
    const interventionResult = screen.getByRole("region", {
      name: "Search result: Feelings Jenga",
    });
    expect(
      within(interventionResult).getByText("Matches interest: Pokémon")
    ).toBeVisible();

    act(() => useCurrentSessionStore.getState().clearContext());
    expect(
      within(interventionResult).queryByText("Matches interest: Pokémon")
    ).toBeNull();
  });
});
