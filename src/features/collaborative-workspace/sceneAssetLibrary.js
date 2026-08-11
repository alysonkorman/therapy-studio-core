import { getIconManifest, searchIcons } from "../../services/icons";

export const SCENE_ASSET_PAGE_SIZE = 48;

const categoryDefinitions = [
  { id: "all", label: "All", symbol: "✨", prefixes: [] },
  {
    id: "people",
    label: "People",
    symbol: "🙂",
    prefixes: ["People"],
  },
  {
    id: "animals",
    label: "Animals",
    symbol: "🐾",
    prefixes: ["Animals"],
  },
  {
    id: "places",
    label: "Places",
    symbol: "🏡",
    prefixes: ["Nature & Weather", "Places & Environments"],
  },
  {
    id: "objects",
    label: "Objects",
    symbol: "🧸",
    prefixes: [
      "Clothing & Accessories",
      "Food & Kitchen",
      "Objects & Tools",
      "Transportation & Travel",
    ],
  },
  {
    id: "feelings-symbols",
    label: "Feelings & Symbols",
    symbol: "💛",
    prefixes: ["Therapy & Visual Supports"],
  },
  {
    id: "play-imagination",
    label: "Play & Imagination",
    symbol: "🪄",
    prefixes: ["Activities", "Fantasy"],
  },
  {
    id: "other",
    label: "Other",
    symbol: "📦",
    prefixes: [],
    fallback: true,
  },
];

function matchesCategory(icon, category) {
  return (
    category.prefixes.some((prefix) => icon.group.startsWith(prefix)) ||
    category.includes?.some((value) => icon.group.includes(value))
  );
}

function isInCategory(icon, category) {
  if (category.id === "all") return true;
  if (!category.fallback) return matchesCategory(icon, category);
  return !categoryDefinitions.some(
    (candidate) =>
      candidate.id !== "all" && !candidate.fallback && matchesCategory(icon, candidate)
  );
}

export function getSceneAssetCategories() {
  const manifest = getIconManifest();
  return categoryDefinitions
    .map((category) => ({
      ...category,
      count: manifest.filter((icon) => isInCategory(icon, category)).length,
    }))
    .filter(({ id, count }) => id === "all" || count > 0)
    .map(({ count, id, label, symbol }) => ({ count, id, label, symbol }));
}

export function browseSceneAssets({ categoryId = "all", limit, query = "" }) {
  const category =
    categoryDefinitions.find(({ id }) => id === categoryId) ?? categoryDefinitions[0];
  const trimmedQuery = query.trim();
  let candidates = trimmedQuery ? searchIcons(trimmedQuery) : getIconManifest();

  if (trimmedQuery && candidates.length === 0) {
    const terms = trimmedQuery.split(/\s+/).filter(Boolean);
    if (terms.length > 1) {
      const matchesByTerm = terms.map(
        (term) => new Set(searchIcons(term).map(({ id }) => id))
      );
      candidates = getIconManifest().filter((icon) =>
        matchesByTerm.every((matches) => matches.has(icon.id))
      );
    }
  }

  const matching = candidates.filter((icon) => isInCategory(icon, category));
  return {
    assets: matching.slice(0, limit).map((icon) => ({
      ...icon,
      assetKind: "icon",
    })),
    total: matching.length,
  };
}
