import { normalizeSearchText } from "../search/normalizeSearchText";

function deckSearchText(deck) {
  return normalizeSearchText(
    [
      deck.title,
      deck.description,
      deck.category,
      ...deck.tags,
      ...deck.prompts.map((prompt) => prompt.text),
    ].join(" ")
  );
}

export function getPromptDeckCategories(decks) {
  return [...new Set(decks.map((deck) => deck.category).filter(Boolean))].sort(
    (first, second) => first.localeCompare(second)
  );
}

export function searchPromptDecks(decks, { query = "", category = "" } = {}) {
  const normalizedQuery = normalizeSearchText(query);

  return decks.filter((deck) => {
    const matchesCategory = !category || deck.category === category;
    const matchesQuery =
      !normalizedQuery || deckSearchText(deck).includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });
}
