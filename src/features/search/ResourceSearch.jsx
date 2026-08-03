import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { resources as defaultResources } from "../../data/resources";
import { searchResources } from "../../engines/search/searchResources";
import { useCurrentSessionStore } from "../../stores/currentSessionStore";
import "../prompts/PromptsPage.css";
import ResourceSearchResult from "./ResourceSearchResult";
import "./ResourceSearch.css";

const suggestedSearches = [
  "shutting down",
  "Pokémon",
  "rapport",
  "10 minutes left",
  "telehealth",
];

export default function ResourceSearch({
  resources = defaultResources,
  sessionContext: suppliedSessionContext,
}) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const storedSessionContext = useCurrentSessionStore((state) => state.context);
  const sessionContext = suppliedSessionContext ?? storedSessionContext;
  const results = useMemo(
    () => searchResources(resources, submittedQuery, { sessionContext }),
    [resources, sessionContext, submittedQuery]
  );

  function runSearch(nextQuery) {
    setQuery(nextQuery);
    setSubmittedQuery(nextQuery);
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSubmittedQuery(query);
  }

  function clearSearch() {
    setQuery("");
    setSubmittedQuery("");
  }

  return (
    <>
      <section className="search-section">
        <form aria-label="Search all resources" onSubmit={handleSubmit}>
          <label className="search-label" htmlFor="therapy-search">
            What do you need right now?
          </label>

          <div className="search-field">
            <Search aria-hidden="true" size={22} />
            <input
              id="therapy-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try: 9 year old with ADHD who will not talk today"
              type="search"
              value={query}
            />
            <button type="submit">Search</button>
          </div>
        </form>

        <div className="suggested-searches">
          <span>Try:</span>
          {suggestedSearches.map((suggestion) => (
            <button key={suggestion} onClick={() => runSearch(suggestion)} type="button">
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      {submittedQuery ? (
        <section
          className="resource-search-results"
          aria-labelledby="search-results-title"
        >
          <div className="resource-search-results__header">
            <div>
              <span className="eyebrow">Universal search</span>
              <h2 id="search-results-title">
                {results.length} {results.length === 1 ? "result" : "results"} for “
                {submittedQuery}”
              </h2>
            </div>
            <button className="resource-search-clear" onClick={clearSearch} type="button">
              <X aria-hidden="true" size={18} />
              Clear Search
            </button>
          </div>

          {results.length ? (
            <div className="resource-search-results__list">
              {results.map((result) => (
                <ResourceSearchResult key={result.resource.id} result={result} />
              ))}
            </div>
          ) : (
            <div className="resource-search-empty">
              <Search aria-hidden="true" size={28} />
              <h3>No resources match that search.</h3>
              <p>Try fewer words or choose one of the suggested searches.</p>
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
