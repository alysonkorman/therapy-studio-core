import { describe, expect, it } from "vitest";

import {
  advanceMemoryAfterMatch,
  advanceMemoryAfterMismatch,
  applyMemoryAction,
  createMemoryGame,
  memoryDifficulties,
} from "./memoryGame";

const symbols = Array.from({ length: 25 }, (_, index) => ({
  id: `image-${index}`,
  image: `/image-${index}.svg`,
}));

describe("Memory game", () => {
  it.each(Object.entries(memoryDifficulties))(
    "creates the requested %s board face-down with fixed card slots",
    (difficulty, { pairs }) => {
      const game = createMemoryGame({
        difficulty,
        symbols,
        theme: "animals",
        random: () => 0.5,
      });
      expect(game.cards).toHaveLength(pairs * 2);
      expect(game.flipped).toEqual([]);
      expect(game.matched).toEqual([]);
    }
  );

  it("keeps the active player on a match and removes only the matched slots", () => {
    const state = {
      ...createMemoryGame({
        difficulty: "easy",
        symbols,
        theme: "animals",
        random: () => 0,
      }),
      cards: [
        { id: "a", image: "/a.svg" },
        { id: "a", image: "/a.svg" },
        ...Array.from({ length: 10 }, (_, index) => ({
          id: `x-${index}`,
          image: `/x-${index}.svg`,
        })),
      ],
    };
    const once = applyMemoryAction(state, {
      type: "memory/flip",
      index: 0,
      player: "host",
      shared: true,
    });
    const matched = applyMemoryAction(once, {
      type: "memory/flip",
      index: 1,
      player: "host",
      shared: true,
    });
    const settled = advanceMemoryAfterMatch(matched);
    expect(settled.activePlayer).toBe("host");
    expect(settled.matched).toEqual([0, 1]);
    expect(settled.scores.host).toBe(1);
    expect(settled.cards).toEqual(state.cards);
  });

  it("holds a mismatch then switches turns while preserving card slots", () => {
    const state = {
      ...createMemoryGame({
        difficulty: "easy",
        symbols,
        theme: "animals",
        random: () => 0,
      }),
      cards: [
        { id: "a", image: "/a.svg" },
        { id: "b", image: "/b.svg" },
        ...Array.from({ length: 10 }, (_, index) => ({
          id: `x-${index}`,
          image: `/x-${index}.svg`,
        })),
      ],
    };
    const once = applyMemoryAction(state, {
      type: "memory/flip",
      index: 0,
      player: "host",
      shared: true,
    });
    const mismatch = applyMemoryAction(once, {
      type: "memory/flip",
      index: 1,
      player: "host",
      shared: true,
    });
    const settled = advanceMemoryAfterMismatch(mismatch);
    expect(mismatch.flipped).toEqual([0, 1]);
    expect(settled.flipped).toEqual([]);
    expect(settled.activePlayer).toBe("participant");
    expect(settled.cards).toEqual(state.cards);
  });
});
