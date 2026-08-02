import { describe, expect, it } from "vitest";

import { getPromptDeckCategories, searchPromptDecks } from "./searchPromptDecks";

const decks = [
  {
    id: "feelings",
    title: "Feelings Check-In",
    description: "Explore emotional awareness.",
    category: "Emotions",
    tags: ["body clues"],
    prompts: [{ text: "Where do you notice worry in your body?" }],
  },
  {
    id: "strengths",
    title: "Superpowers",
    description: "",
    category: "Strengths",
    tags: ["confidence"],
    prompts: [{ text: "What did you do that felt brave?" }],
  },
];

describe("searchPromptDecks", () => {
  it("searches deck title and contained prompt text without case sensitivity", () => {
    expect(searchPromptDecks(decks, { query: "feelings" })).toEqual([decks[0]]);
    expect(searchPromptDecks(decks, { query: "NOTICE WORRY" })).toEqual([decks[0]]);
  });

  it("filters by exact category and combines it with search", () => {
    expect(searchPromptDecks(decks, { category: "Strengths" })).toEqual([decks[1]]);
    expect(searchPromptDecks(decks, { query: "brave", category: "Emotions" })).toEqual(
      []
    );
  });

  it("returns sorted unique categories", () => {
    expect(getPromptDeckCategories([...decks, decks[0]])).toEqual([
      "Emotions",
      "Strengths",
    ]);
  });
});
