import { describe, expect, it } from "vitest";

import { normalizeSearchText, tokenizeSearchQuery } from "./normalizeSearchText";

describe("normalizeSearchText", () => {
  it("ignores capitalization, punctuation, and repeated whitespace", () => {
    expect(normalizeSearchText("  Drawing,   FEELINGS!! ")).toBe("drawing feelings");
  });

  it("normalizes straight and curly apostrophes consistently", () => {
    expect(normalizeSearchText("ADHD won't talk")).toBe("adhd wont talk");
    expect(normalizeSearchText("ADHD won’t talk")).toBe("adhd wont talk");
  });

  it("returns unique normalized query tokens", () => {
    expect(tokenizeSearchQuery(" Rapport, rapport  Pokémon ")).toEqual([
      "rapport",
      "pokemon",
    ]);
  });
});
