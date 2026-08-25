export class BingoBoardError extends Error {
  constructor(message) {
    super(message);
    this.name = "BingoBoardError";
  }
}

function shuffled(items, random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

export function createBingoBoard(game, { random = Math.random } = {}) {
  const cellCount = game.boardSize ** 2;
  const hasFreeSpace = game.useFreeSpace && game.boardSize % 2 === 1;
  const requiredItems = cellCount - (hasFreeSpace ? 1 : 0);
  if (game.items.length < requiredItems) {
    throw new BingoBoardError(
      `${game.boardSize}×${game.boardSize} Bingo needs at least ${requiredItems} unique items.`
    );
  }
  const selected = shuffled(game.items, random).slice(0, requiredItems);
  const centerIndex = Math.floor(cellCount / 2);
  const cells = [];
  let itemIndex = 0;
  for (let index = 0; index < cellCount; index += 1) {
    if (hasFreeSpace && index === centerIndex) {
      cells.push({ id: "free-space", text: "Free Space", free: true });
    } else {
      cells.push({ ...selected[itemIndex], free: false });
      itemIndex += 1;
    }
  }
  return { size: game.boardSize, cells, hasFreeSpace };
}

export function hasBingo(board, markedIds) {
  const marked = new Set(markedIds);
  const complete = (indexes) =>
    indexes.every((index) => marked.has(board.cells[index].id));
  const lines = [];
  for (let row = 0; row < board.size; row += 1) {
    lines.push(
      Array.from({ length: board.size }, (_, column) => row * board.size + column)
    );
  }
  for (let column = 0; column < board.size; column += 1) {
    lines.push(Array.from({ length: board.size }, (_, row) => row * board.size + column));
  }
  lines.push(
    Array.from({ length: board.size }, (_, index) => index * board.size + index)
  );
  lines.push(
    Array.from(
      { length: board.size },
      (_, index) => index * board.size + (board.size - index - 1)
    )
  );
  return lines.some(complete);
}
