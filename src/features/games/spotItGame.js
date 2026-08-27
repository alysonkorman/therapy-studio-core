const fieldPoint = (x, y) => `p${x}-${y}`;
const infinityPoint = (slope) => `i${slope}`;

export function createSpotItDeck(symbolIds) {
  if (new Set(symbolIds).size !== 57)
    throw new Error("Spot It requires 57 unique symbols.");
  const points = [];
  for (let slope = 0; slope < 7; slope += 1)
    for (let intercept = 0; intercept < 7; intercept += 1)
      points.push([
        ...Array.from({ length: 7 }, (_, x) =>
          fieldPoint(x, (slope * x + intercept) % 7)
        ),
        infinityPoint(slope),
      ]);
  for (let x = 0; x < 7; x += 1)
    points.push([
      ...Array.from({ length: 7 }, (_, y) => fieldPoint(x, y)),
      infinityPoint("vertical"),
    ]);
  points.push([
    ...Array.from({ length: 7 }, (_, slope) => infinityPoint(slope)),
    infinityPoint("vertical"),
  ]);
  return points.map((card) =>
    card.map((point) => {
      if (point === "ivertical") return symbolIds[56];
      if (point.startsWith("i")) return symbolIds[49 + Number(point.slice(1))];
      const [, x, y] = point.match(/^p(\d)-(\d)$/);
      return symbolIds[Number(x) * 7 + Number(y)];
    })
  );
}

export const shuffle = (items, random = Math.random) => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

export function createSpotItGame({ symbolIds, theme, random = Math.random }) {
  const deck = shuffle(createSpotItDeck(symbolIds), random).map((card) =>
    shuffle(card, random)
  );
  return {
    complete: false,
    currentIndex: 0,
    deck,
    feedback: null,
    score: 0,
    symbolIds,
    theme,
    version: 2,
  };
}

export function visibleCards(state) {
  return state.complete
    ? []
    : [state.deck[state.currentIndex], state.deck[state.currentIndex + 1]];
}

export function matchingSymbol(state) {
  const [left = [], right = []] = visibleCards(state);
  return left.find((symbolId) => right.includes(symbolId)) ?? null;
}

export function progress(state) {
  return state.complete ? 57 : Math.min(state.currentIndex + 2, 57);
}

export function applySpotItAction(state, action) {
  const match = matchingSymbol(state);
  if (action.type === "spot-it/found") {
    if (state.complete || state.feedback || action.symbolId !== match) return state;
    return {
      ...state,
      feedback: { player: action.player, symbolId: action.symbolId, type: "match" },
      score: state.score + 1,
    };
  }
  if (action.type === "spot-it/incorrect") {
    if (state.complete || state.feedback || action.symbolId === match) return state;
    return {
      ...state,
      feedback: { player: action.player, symbolId: action.symbolId, type: "incorrect" },
    };
  }
  if (action.type === "spot-it/advance") {
    if (state.feedback?.type !== "match") return state;
    if (state.currentIndex >= 55)
      return { ...state, complete: true, currentIndex: 56, feedback: null };
    return { ...state, currentIndex: state.currentIndex + 1, feedback: null };
  }
  if (action.type === "spot-it/clear-feedback")
    return state.feedback?.type === "incorrect" ? { ...state, feedback: null } : state;
  return action.type === "spot-it/replace" ? action.state : state;
}

const hash = (value) =>
  [...value].reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) >>> 0,
    2166136261
  );

const unit = (seed) => ((seed % 10000) / 10000) * 2 - 1;
const safePositions = [
  [50, 22],
  [30, 30],
  [70, 30],
  [20, 50],
  [50, 50],
  [80, 50],
  [31, 72],
  [69, 72],
];
const sizes = [16, 15, 15, 14, 23, 14, 16, 16];
const rotations = [-180, -135, -105, -75, -45, -20, 0, 25, 50, 75, 105, 135, 180];

export function symbolPresentation({ cardIndex, index, symbolId }) {
  const seed = hash(`${cardIndex}:${index}:${symbolId}`);
  const [baseX, baseY] = safePositions[index];
  return {
    "--spot-rotation": `${rotations[seed % rotations.length]}deg`,
    "--spot-size": `${sizes[index]}%`,
    "--spot-x": `${baseX + unit(seed >>> 3) * 2.4}%`,
    "--spot-y": `${baseY + unit(seed >>> 7) * 2.4}%`,
  };
}
