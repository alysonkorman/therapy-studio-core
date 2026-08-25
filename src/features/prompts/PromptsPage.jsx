import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import categoryBlue from "../../assets/prompt-category-backgrounds/category-blue.jpg";
import categoryEmber from "../../assets/prompt-category-backgrounds/category-ember.jpg";
import categoryPlum from "../../assets/prompt-category-backgrounds/category-plum.jpg";
import categorySlate from "../../assets/prompt-category-backgrounds/category-slate.jpg";

import {
  getPromptDeckCategories,
  searchPromptDecks,
} from "../../engines/prompts/searchPromptDecks";
import PromptDeckCard from "./PromptDeckCard";
import PromptAuthoringPanel from "./PromptAuthoringPanel";
import formatPromptDisplayLabel from "./formatPromptDisplayLabel";
import { summarizePromptDeckPersistence } from "./promptDeckPersistenceStatus";
import { usePromptAuthoring } from "./usePromptAuthoring";
import "./PromptsPage.css";
import { resourceMemoryRepository } from "../../lib/data";

function isBuiltInDeck(deck) {
  return deck?.legacyMetadata?.provenance?.bundled === true;
}

const categoryBackgrounds = [categoryBlue, categorySlate, categoryPlum, categoryEmber];

export default function PromptsPage({
  decks: suppliedDecks,
  memoryRepository = resourceMemoryRepository,
  repositories,
}) {
  const authoring = usePromptAuthoring({ enabled: !suppliedDecks, repositories });
  const [searchParams, setSearchParams] = useSearchParams();
  const routeCategory = searchParams.get("category") ?? "";
  const [showArchived, setShowArchived] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedDeckIds, setSelectedDeckIds] = useState(() => new Set());
  const [toolsOpen, setToolsOpen] = useState(false);
  const decks = useMemo(
    () => suppliedDecks ?? authoring.decks ?? [],
    [authoring.decks, suppliedDecks]
  );
  const activeDecks = decks.filter((deck) => !deck.archived);
  // A reset/import mismatch can leave a whole library marked archived. Keep it
  // visible instead of presenting an empty library when saved decks still exist.
  const showingSavedArchivedDecks = !showArchived && !activeDecks.length && decks.length > 0;
  const visibleDecks = showArchived || showingSavedArchivedDecks ? decks : activeDecks;
  const [query, setQuery] = useState("");
  const category = routeCategory;
  const [showAllDecks, setShowAllDecks] = useState(Boolean(routeCategory));
  const showingDecks = showAllDecks || Boolean(routeCategory);
  const [memoryFilter, setMemoryFilter] = useState("");
  const [memorySort, setMemorySort] = useState("");
  const [memoryMap, setMemoryMap] = useState(new Map());
  const categoryOptions = useMemo(
    () =>
      [
        ...new Set([
          ...getPromptDeckCategories(visibleDecks),
          ...(category ? [category] : []),
        ]),
      ].sort((left, right) =>
        formatPromptDisplayLabel(left).localeCompare(formatPromptDisplayLabel(right))
      ),
    [category, visibleDecks]
  );
  const categoryTiles = useMemo(() => {
    const names = new Map();
    for (const item of authoring.categories ?? []) {
      if (!item.archived && item.name?.trim())
        names.set(item.name.trim().toLowerCase(), item.name);
    }
    for (const deck of visibleDecks) {
      if (deck.category?.trim())
        names.set(deck.category.trim().toLowerCase(), deck.category);
    }
    return [...names.values()]
      .sort((left, right) =>
        formatPromptDisplayLabel(left).localeCompare(formatPromptDisplayLabel(right))
      )
      .map((name, index) => ({
        name,
        deckCount: visibleDecks.filter((deck) => deck.category === name).length,
        background: categoryBackgrounds[index % categoryBackgrounds.length],
      }));
  }, [authoring.categories, visibleDecks]);

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
  const persistenceSummary = useMemo(
    () =>
      summarizePromptDeckPersistence(
        decks,
        authoring.deckSyncRecords ?? new Map(),
        new Set()
      ),
    [authoring.deckSyncRecords, decks]
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

  async function removeDecks(decksToRemove) {
    if (!decksToRemove.length) return;
    const message =
      decksToRemove.length === 1
        ? `Delete “${decksToRemove[0].title}”? This permanently removes the deck and its prompts.`
        : `Delete ${decksToRemove.length} selected decks? This permanently removes their prompts.`;
    if (!window.confirm(message)) return;
    const ids = decksToRemove.map(({ id }) => id);
    try {
      await authoring.run(() => authoring.repositories.decks.deletePromptDecks(ids));
    } catch {
      // The local transaction may have completed before an account-sync follow-up
      // reports an error. Refresh so the visible library always reflects local truth.
      await authoring.refresh();
    } finally {
      setSelectedDeckIds(new Set());
    }
  }

  function toggleSelection(id) {
    setSelectedDeckIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearResults() {
    setQuery("");
    setSearchParams({});
    setMemoryFilter("");
    setMemorySort("");
  }

  function openCategory(categoryName) {
    setShowAllDecks(true);
    setSearchParams({ category: categoryName });
  }

  function openAllDecks() {
    setShowAllDecks(true);
    setSearchParams({});
  }

  function returnToCategories() {
    clearResults();
    setShowAllDecks(false);
    setSearchParams({});
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
  }

  return (
    <div className="prompts-page">
      <header className="prompts-page__header">
        <p className="eyebrow">Prompt Library</p>
        <h1>{showingDecks ? "Prompt decks" : "Choose a prompt category."}</h1>
        <p>
          {showingDecks
            ? `Browse ${decks.length} decks with ${totalPromptCount.toLocaleString()} prompts.`
            : "Start with the kind of conversation you need today."}
        </p>
        <div className="prompt-library-home-actions">
          {showingDecks ? (
            <button onClick={returnToCategories} type="button">
              Browse categories
            </button>
          ) : null}
          {!showingDecks ? (
            <button className="button-primary" onClick={openAllDecks} type="button">
              Show all prompt decks
            </button>
          ) : null}
        </div>
      </header>

      {showingSavedArchivedDecks ? (
        <p className="prompt-sync-summary" role="status">
          Your saved decks were marked archived, so they are being shown here instead of hidden.
        </p>
      ) : null}

      {!showingDecks ? (
        <section
          aria-labelledby="prompt-category-browser-title"
          className="prompt-category-browser"
        >
          <div>
            <p className="eyebrow">Browse by category</p>
            <h2 id="prompt-category-browser-title">What would you like to explore?</h2>
          </div>
          {categoryTiles.length ? (
            <div className="prompt-category-grid">
              {categoryTiles.map((item) => (
                <button
                  className="prompt-category-tile"
                  key={item.name}
                  onClick={() => openCategory(item.name)}
                  style={{ backgroundImage: `url(${item.background})` }}
                  type="button"
                >
                  <span>{formatPromptDisplayLabel(item.name)}</span>
                  <small>
                    {item.deckCount} {item.deckCount === 1 ? "deck" : "decks"}
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <p className="prompt-empty-state">
              Create a category and your first deck from Library Tools.
            </p>
          )}
        </section>
      ) : (
        <form
          aria-label="Search prompt decks"
          className="prompt-filters"
          onSubmit={handleSearchSubmit}
        >
          <div className="prompt-filters__primary">
            <label className="prompt-filters__search">
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
          </div>
          <div className="prompt-filters__secondary">
            <label>
              Category
              <select
                onChange={(event) => {
                  setSearchParams(
                    event.target.value ? { category: event.target.value } : {}
                  );
                }}
                value={category}
              >
                <option value="">All categories</option>
                {categoryOptions.map((categoryName) => (
                  <option key={categoryName} value={categoryName}>
                    {formatPromptDisplayLabel(categoryName)}
                  </option>
                ))}
              </select>
            </label>
            <p aria-live="polite" className="prompts-page__summary">
              Showing {matchingDecks.length} of {visibleDecks.length} decks
            </p>
            <button disabled={!hasActiveFilters} onClick={clearResults} type="button">
              <X aria-hidden="true" size={16} />
              Clear results
            </button>
          </div>
        </form>
      )}

      {!suppliedDecks ? (
        <p aria-live="polite" className="prompt-sync-summary">
          <strong>Deck storage:</strong> {persistenceSummary.builtIn} built-in ·{" "}
          {persistenceSummary.synced} account-owned synced ·{" "}
          {persistenceSummary.localOnly} local-only · {persistenceSummary.conflicts}{" "}
          conflicts
        </p>
      ) : null}

      {!suppliedDecks ? (
        <details
          className="prompt-library-tools"
          onToggle={(event) => {
            const open = event.currentTarget.open;
            setToolsOpen(open);
            if (!open) setReorderMode(false);
          }}
          open={toolsOpen}
        >
          <summary aria-expanded={toolsOpen}>Library Tools</summary>
          <div className="prompt-library-tools__content">
            <PromptAuthoringPanel
              authoring={authoring}
              onDeckCreated={(deck) => {
                openCategory(deck.category || "");
                setToolsOpen(false);
              }}
              setShowArchived={setShowArchived}
              showArchived={showArchived}
            />
            {authoring.seeded ? (
              <div className="prompt-library-actions">
                <button
                  className="reorder-toggle"
                  onClick={() => setReorderMode((value) => !value)}
                  type="button"
                >
                  {reorderMode ? "Finish reordering" : "Reorder decks"}
                </button>
                <button
                  className="reorder-toggle"
                  onClick={() => {
                    setSelectMode((value) => !value);
                    setSelectedDeckIds(new Set());
                  }}
                  type="button"
                >
                  {selectMode ? "Done selecting" : "Select decks"}
                </button>
              </div>
            ) : null}
            {authoring.error && authoring.seeded ? (
              <p className="authoring-error" role="alert">
                {authoring.error}
              </p>
            ) : null}
          </div>
        </details>
      ) : null}

      {selectMode ? (
        <section aria-label="Bulk deck actions" className="prompt-bulk-actions">
          <strong>{selectedDeckIds.size} selected</strong>
          <button
            onClick={() => setSelectedDeckIds(new Set(matchingDecks.map(({ id }) => id)))}
            type="button"
          >
            Select all results
          </button>
          <button onClick={() => setSelectedDeckIds(new Set())} type="button">
            Deselect all
          </button>
          <button
            className="button-destructive"
            disabled={!selectedDeckIds.size}
            onClick={() =>
              void removeDecks(matchingDecks.filter(({ id }) => selectedDeckIds.has(id)))
            }
            type="button"
          >
            Delete selected
          </button>
        </section>
      ) : null}

      {showingDecks && matchingDecks.length ? (
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
              onDelete={
                !selectMode && !suppliedDecks && authoring.seeded
                  ? (deck) => void removeDecks([deck])
                  : undefined
              }
              onSelect={toggleSelection}
              selectMode={selectMode}
              selected={selectedDeckIds.has(deck.id)}
              builtIn={isBuiltInDeck(deck)}
              syncRecord={authoring.deckSyncRecords?.get(deck.id)}
              returnTo={category}
              total={visibleDecks.length}
            />
          ))}
        </div>
      ) : showingDecks ? (
        <section className="prompt-empty-state">
          <Search aria-hidden="true" size={28} />
          <h2>No prompt decks match.</h2>
          <p>Try another search or clear the current results.</p>
        </section>
      ) : null}
    </div>
  );
}
