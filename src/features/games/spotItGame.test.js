import { describe, expect, it } from "vitest";

import {
  applySpotItAction,
  createSpotItDeck,
  createSpotItGame,
  matchingSymbol,
  progress,
  visibleCards,
} from "./spotItGame";

const symbols = Array.from({ length: 57 }, (_, index) => `symbol-${index}`);

describe("Spot It game", () => {
  it("creates the complete 57-card deck with exactly one shared symbol per pair", () => {
    const deck = createSpotItDeck(symbols);
    expect(deck).toHaveLength(57);
    expect(deck.every((card) => card.length === 8)).toBe(true);
    for (let left = 0; left < deck.length; left += 1)
      for (let right = left + 1; right < deck.length; right += 1)
        expect(deck[left].filter((symbol) => deck[right].includes(symbol))).toHaveLength(
          1
        );
  });

  it("advances through a finite ordered deck without reusing a card", () => {
    let state = createSpotItGame({
      symbolIds: symbols,
      theme: "assorted",
      random: () => 0.5,
    });
    const seenCards = new Set();
    while (!state.complete) {
      visibleCards(state).forEach((card) => seenCards.add(card.join(",")));
      state = applySpotItAction(state, {
        player: "host",
        symbolId: matchingSymbol(state),
        type: "spot-it/found",
      });
      state = applySpotItAction(state, { type: "spot-it/advance" });
    }
    expect(seenCards).toHaveLength(57);
    expect(progress(state)).toBe(57);
    expect(state.score).toBe(56);
  });
});
