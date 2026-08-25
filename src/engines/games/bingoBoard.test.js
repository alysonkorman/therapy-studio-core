import { describe, expect, it } from "vitest";

import { pictureWordBingo } from "../../data/resources";
import { createBingoBoard, hasBingo } from "./bingoBoard";

describe("createBingoBoard", () => {
  it.each([3, 4, 5])("creates a duplicate-free %sx%s board", (size) => {
    const board = createBingoBoard(
      { ...pictureWordBingo, boardSize: size },
      { random: () => 0.5 }
    );
    expect(board.cells).toHaveLength(size ** 2);
    expect(new Set(board.cells.map(({ id }) => id)).size).toBe(size ** 2);
  });

  it("uses the center Free Space only on odd boards", () => {
    const odd = createBingoBoard(
      { ...pictureWordBingo, boardSize: 5, useFreeSpace: true },
      { random: () => 0.5 }
    );
    const even = createBingoBoard(
      { ...pictureWordBingo, boardSize: 4, useFreeSpace: true },
      { random: () => 0.5 }
    );
    expect(odd.cells[12]).toMatchObject({ id: "free-space", free: true });
    expect(even.cells.some(({ free }) => free)).toBe(false);
  });

  it("rejects a pool that cannot fill the board", () => {
    expect(() =>
      createBingoBoard({ ...pictureWordBingo, boardSize: 5, items: [] })
    ).toThrow(/needs at least 24 unique items/i);
  });
});

describe("hasBingo", () => {
  const board = createBingoBoard(
    { ...pictureWordBingo, boardSize: 3, useFreeSpace: false },
    { random: () => 0.5 }
  );
  it.each([
    ["row", [0, 1, 2]],
    ["column", [0, 3, 6]],
    ["diagonal", [0, 4, 8]],
  ])("detects a completed %s", (_, indexes) => {
    expect(
      hasBingo(
        board,
        indexes.map((index) => board.cells[index].id)
      )
    ).toBe(true);
  });
  it("does not report incomplete lines", () => {
    expect(hasBingo(board, [board.cells[0].id, board.cells[1].id])).toBe(false);
  });
});
