function normalizeSearchValue(value) {
  return value.trim().toLocaleLowerCase();
}

function deckSearchText(deck) {
  return [
    deck.title,
    deck.description,
    deck.category,
    ...deck.tags,
    ...deck.prompts.map((prompt) => prompt.text),
  ]
    .join(" ")
    .toLocaleLowerCase();
}

export function getPromptDeckCategories(decks) {
  return [...new Set(decks.map((deck) => deck.category).filter(Boolean))].sort(
    (first, second) => first.localeCompare(second)
  );
}

export function searchPromptDecks(decks, { query = "", category = "" } = {}) {
  const normalizedQuery = normalizeSearchValue(query);

  return decks.filter((deck) => {
    const matchesCategory = !category || deck.category === category;
    const matchesQuery =
      !normalizedQuery || deckSearchText(deck).includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });
}
