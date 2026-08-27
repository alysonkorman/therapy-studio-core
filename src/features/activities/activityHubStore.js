const key = "therapy-studio:activities-hub";
const defaultState = {
  favorites: [],
  recent: [],
  context: {
    search: "",
    type: "all",
    ages: [],
    goals: [],
    formats: [],
    shortcut: "",
    sort: "recommended",
    scrollY: 0,
  },
};

export function loadActivityHub() {
  try {
    return {
      ...defaultState,
      ...JSON.parse(localStorage.getItem(key) ?? "{}"),
      context: {
        ...defaultState.context,
        ...JSON.parse(localStorage.getItem(key) ?? "{}").context,
      },
    };
  } catch {
    return defaultState;
  }
}
export function saveActivityHub(next) {
  localStorage.setItem(key, JSON.stringify(next));
}
export function toggleActivityFavorite(state, id) {
  const favorites = state.favorites.includes(id)
    ? state.favorites.filter((item) => item !== id)
    : [...state.favorites, id];
  return { ...state, favorites };
}
export function markActivityUsed(state, id) {
  return {
    ...state,
    recent: [id, ...state.recent.filter((item) => item !== id)].slice(0, 24),
  };
}
