export const createISpyGame = (board) => ({
  boardId: board.id,
  clueOrder: (board.selectedTargetIds.length
    ? board.selectedTargetIds
    : board.targets.map((target) => target.id)
  ).flatMap(
    (id) =>
      board.targets
        .find((target) => target.id === id)
        ?.clues.map((clue, index) => ({ targetId: id, clue, id: `${id}-${index}` })) ?? []
  ),
  index: 0,
  feedback: null,
});
export const hitTarget = (region, x, y) =>
  x >= region.x &&
  x <= region.x + region.width &&
  y >= region.y &&
  y <= region.y + region.height;
