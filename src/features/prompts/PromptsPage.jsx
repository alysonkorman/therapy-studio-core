import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { promptDecks } from "../../data/resources";
import {
  getPromptDeckCategories,
  searchPromptDecks,
} from "../../engines/prompts/searchPromptDecks";
import PromptDeckCard from "./PromptDeckCard";
import "./PromptsPage.css";

export default function PromptsPage({ decks = promptDecks }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const categories = useMemo(() => getPromptDeckCategories(decks), [decks]);
  const matchingDecks = useMemo(
    () => searchPromptDecks(decks, { query, category }),
    [category, decks, query]
  );
  const hasActiveFilters = Boolean(query || category);
  const totalPromptCount = decks.reduce((total, deck) => total + deck.prompts.length, 0);

  function clearResults() {
    setQuery("");
    setCategory("");
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
        Showing {matchingDecks.length} of {decks.length} decks
      </p>

      {matchingDecks.length ? (
        <div className="prompt-deck-grid">
          {matchingDecks.map((deck) => (
            <PromptDeckCard deck={deck} key={deck.id} />
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
