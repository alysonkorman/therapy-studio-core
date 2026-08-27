export const memoryDifficulties = Object.freeze({
  easy: { label: "Easy", pairs: 6 },
  medium: { label: "Medium", pairs: 8 },
  hard: { label: "Hard", pairs: 12 },
  challenge: { label: "Challenge", pairs: 18 },
  expert: { label: "Expert", pairs: 25 },
});

export const shuffle = (items, random = Math.random) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

export function createMemoryGame({
  theme,
  difficulty,
  symbols,
  startingPlayer = "host",
  random,
}) {
  const pairCount = memoryDifficulties[difficulty]?.pairs;
  if (!pairCount) throw new Error(`Unknown Memory difficulty: ${difficulty}`);
  const usableSymbols = symbols
    .filter((symbol) => symbol?.id && symbol?.image)
    .slice(0, pairCount);
  if (usableSymbols.length !== pairCount)
    throw new Error(`The ${theme} theme does not have ${pairCount} usable images.`);

  return {
    version: 2,
    activePlayer: startingPlayer,
    cards: shuffle(
      usableSymbols.flatMap((symbol) => [
        { id: symbol.id, image: symbol.image },
        { id: symbol.id, image: symbol.image },
      ]),
      random
    ),
    difficulty,
    feedback: null,
    flipped: [],
    matched: [],
    scores: { host: 0, participant: 0 },
    startingPlayer,
    theme,
  };
}

export function completeMemoryGame(state) {
  return state.matched.length === state.cards.length;
}

export function canFlipMemoryCard(state, { index, player, shared }) {
  if (completeMemoryGame(state) || state.feedback || state.flipped.length >= 2)
    return false;
  if (shared && state.activePlayer !== player) return false;
  return (
    Boolean(state.cards[index]) &&
    !state.matched.includes(index) &&
    !state.flipped.includes(index)
  );
}

export function applyMemoryAction(state, action) {
  if (action.type === "memory/replace") return action.state;
  if (action.type === "memory/clear-feedback")
    return state.feedback?.type === "mismatch"
      ? { ...state, feedback: null, flipped: [] }
      : state;
  if (action.type !== "memory/flip") return state;
  if (!canFlipMemoryCard(state, action)) return state;

  const flipped = [...state.flipped, action.index];
  if (flipped.length < 2) return { ...state, flipped };

  const [first, second] = flipped;
  if (state.cards[first].id !== state.cards[second].id)
    return { ...state, flipped, feedback: { type: "mismatch", cards: flipped } };

  return {
    ...state,
    feedback: { type: "match", cards: flipped, player: action.player },
    flipped,
    matched: [...state.matched, ...flipped],
    scores: { ...state.scores, [action.player]: state.scores[action.player] + 1 },
  };
}

export function advanceMemoryAfterMatch(state) {
  if (state.feedback?.type !== "match") return state;
  return { ...state, feedback: null, flipped: [] };
}

export function advanceMemoryAfterMismatch(state) {
  if (state.feedback?.type !== "mismatch") return state;
  return {
    ...state,
    activePlayer: state.activePlayer === "host" ? "participant" : "host",
    feedback: null,
    flipped: [],
  };
}
