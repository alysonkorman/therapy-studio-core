import { describe, expect, it } from "vitest";

import { bingoGameSchema } from "../../models";
import { bingoSets, pictureWordBingo } from "./bingoSets";

describe("Bingo starters", () => {
  it("contains one valid original set with enough unique items", () => {
    expect(bingoSets).toHaveLength(1);
    expect(bingoGameSchema.parse(pictureWordBingo)).toEqual(pictureWordBingo);
    expect(pictureWordBingo.items).toHaveLength(32);
    expect(new Set(pictureWordBingo.items.map(({ id }) => id)).size).toBe(32);
    expect(pictureWordBingo.source).toBe("Original Therapy Studio content");
  });
});
