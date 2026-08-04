import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  getPromptDeckCategories,
  searchPromptDecks,
} from "../../engines/prompts/searchPromptDecks";
import PromptDeckCard from "./PromptDeckCard";
import PromptAuthoringPanel from "./PromptAuthoringPanel";
import { usePromptAuthoring } from "./usePromptAuthoring";
import "./PromptsPage.css";
import { resourceMemoryRepository } from "../../lib/data";

export default function PromptsPage({
  decks: suppliedDecks,
  memoryRepository = resourceMemoryRepository,
  repositories,
}) {
  const authoring = usePromptAuthoring({ enabled: !suppliedDecks, repositories });
  const [showArchived, setShowArchived] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const decks = suppliedDecks ?? authoring.decks;
  const visibleDecks = decks.filter((deck) => showArchived || !deck.archived);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [memoryFilter, setMemoryFilter] = useState("");
  const [memorySort, setMemorySort] = useState("");
  const [memoryMap, setMemoryMap] = useState(new Map());
  const categories = useMemo(() => getPromptDeckCategories(visibleDecks), [visibleDecks]);
  useEffect(() => {
    void memoryRepository
      .getResourceMemoryMap(decks.map(({ id }) => id))
      .then(setMemoryMap)
      .catch(() => setMemoryMap(new Map()));
  }, [decks, memoryRepository]);

  const refreshMemory = () =>
    void memoryRepository
      .getResourceMemoryMap(decks.map(({ id }) => id))
      .then(setMemoryMap);

  const matchingDecks = useMemo(() => {
    const searched = searchPromptDecks(visibleDecks, { query, category }).filter(
      (deck) => memoryFilter !== "favorites" || memoryMap.get(deck.id)?.favorite
    );
    if (!memorySort) return searched;
    return [...searched].sort((left, right) => {
      const leftMemory = memoryMap.get(left.id);
      const rightMemory = memoryMap.get(right.id);
      if (memorySort === "rating")
        return (
          (rightMemory?.rating ?? 0) - (leftMemory?.rating ?? 0) ||
          left.id.localeCompare(right.id)
        );
      if (memorySort === "recent")
        return (
          String(rightMemory?.lastUsedAt ?? "").localeCompare(
            String(leftMemory?.lastUsedAt ?? "")
          ) || left.id.localeCompare(right.id)
        );
      return (
        (rightMemory?.useCount ?? 0) - (leftMemory?.useCount ?? 0) ||
        left.id.localeCompare(right.id)
      );
    });
  }, [category, memoryFilter, memoryMap, memorySort, query, visibleDecks]);
  const hasActiveFilters = Boolean(query || category || memoryFilter || memorySort);
  const totalPromptCount = visibleDecks.reduce(
    (total, deck) => total + deck.prompts.length,
    0
  );

  async function moveDeck(index, offset) {
    const ordered = visibleDecks.map(({ id }) => id);
    const target = index + offset;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    const archivedIds = decks
      .filter((deck) => deck.archived && !ordered.includes(deck.id))
      .map(({ id }) => id);
    await authoring.run(() =>
      authoring.repositories.decks.reorderPromptDecks([...ordered, ...archivedIds])
    );
  }

  function clearResults() {
    setQuery("");
    setCategory("");
    setMemoryFilter("");
    setMemorySort("");
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
  }

  return (
    <div className="prompts-page">
      <header className="prompts-page__header">
        <p className="eyebrow">Prompt Library</p>
        <h1>Find a question for right now.</h1>
        <p>
          Browse {decks.length} decks with {totalPromptCount.toLocaleString()} prompts.
        </p>
      </header>

      {!suppliedDecks ? (
        <PromptAuthoringPanel
          authoring={authoring}
          setShowArchived={setShowArchived}
          showArchived={showArchived}
        />
      ) : null}
      {!suppliedDecks && authoring.seeded ? (
        <button
          className="reorder-toggle"
          onClick={() => setReorderMode((value) => !value)}
          type="button"
        >
          {reorderMode ? "Finish reordering" : "Reorder decks"}
        </button>
      ) : null}
      {authoring.error && authoring.seeded ? (
        <p className="authoring-error" role="alert">
          {authoring.error}
        </p>
      ) : null}

      <form
        aria-label="Search prompt decks"
        className="prompt-filters"
        onSubmit={handleSearchSubmit}
      >
        <label>
          Search prompts
          <span className="prompt-search-control">
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search decks or prompt text"
              type="search"
              value={query}
            />
            <button type="submit">
              <Search aria-hidden="true" size={18} />
              Search
            </button>
          </span>
        </label>
        <label>
          Resource Memory
          <select
            onChange={(event) => setMemoryFilter(event.target.value)}
            value={memoryFilter}
          >
            <option value="">All decks</option>
            <option value="favorites">Favorites</option>
          </select>
        </label>
        <label>
          Sort
          <select
            onChange={(event) => setMemorySort(event.target.value)}
            value={memorySort}
          >
            <option value="">Library order</option>
            <option value="rating">Highest rated</option>
            <option value="recent">Recently used</option>
            <option value="used">Most used</option>
          </select>
        </label>
        <label>
          Category
          <select onChange={(event) => setCategory(event.target.value)} value={category}>
            <option value="">All categories</option>
            {categories.map((categoryName) => (
              <option key={categoryName} value={categoryName}>
                {categoryName}
              </option>
            ))}
          </select>
        </label>
        <button disabled={!hasActiveFilters} onClick={clearResults} type="button">
          <X aria-hidden="true" size={18} />
          Clear results
        </button>
      </form>

      <p className="prompts-page__summary" aria-live="polite">
        Showing {matchingDecks.length} of {visibleDecks.length} decks
      </p>

      {matchingDecks.length ? (
        <div className="prompt-deck-grid">
          {matchingDecks.map((deck) => (
            <PromptDeckCard
              authoring={
                reorderMode
                  ? {
                      move: moveDeck,
                      duplicate: (id) =>
                        void authoring.run(() =>
                          authoring.repositories.decks.duplicatePromptDeck(id)
                        ),
                      toggleArchive: (item) =>
                        void authoring.run(() =>
                          item.archived
                            ? authoring.repositories.decks.restorePromptDeck(item.id)
                            : authoring.repositories.decks.archivePromptDeck(item.id)
                        ),
                    }
                  : null
              }
              deck={deck}
              index={visibleDecks.findIndex(({ id }) => id === deck.id)}
              key={deck.id}
              memoryRepository={memoryRepository}
              onMemoryChange={refreshMemory}
              total={visibleDecks.length}
            />
          ))}
        </div>
      ) : (
        <section className="prompt-empty-state">
          <Search aria-hidden="true" size={28} />
          <h2>No prompt decks match.</h2>
          <p>Try another search or clear the current results.</p>
        </section>
      )}
    </div>
  );
}
