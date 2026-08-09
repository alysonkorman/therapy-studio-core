import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { resources as defaultResources } from "../../data/resources";
import { assembleSearchResources } from "../../engines/search/assembleSearchResources";
import { searchResources } from "../../engines/search/searchResources";
import { worksheetRepository } from "../../lib/data";
import { getResourceKey } from "../../models";
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
  persistedWorksheetRepository: suppliedWorksheetRepository,
  sessionContext: suppliedSessionContext,
}) {
  const activeWorksheetRepository =
    suppliedWorksheetRepository ??
    (resources === defaultResources ? worksheetRepository : null);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [persistedWorksheets, setPersistedWorksheets] = useState([]);
  const [worksheetSourceStatus, setWorksheetSourceStatus] = useState(
    activeWorksheetRepository ? "loading" : "ready"
  );
  const storedSessionContext = useCurrentSessionStore((state) => state.context);
  const sessionContext = suppliedSessionContext ?? storedSessionContext;

  useEffect(() => {
    let active = true;

    if (!activeWorksheetRepository) {
      return () => {
        active = false;
      };
    }

    activeWorksheetRepository
      .getAllWorksheets()
      .then((worksheets) => {
        if (!active) return;
        setPersistedWorksheets(worksheets);
        setWorksheetSourceStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setPersistedWorksheets([]);
        setWorksheetSourceStatus("error");
      });

    return () => {
      active = false;
    };
  }, [activeWorksheetRepository]);

  const searchableResources = useMemo(
    () => assembleSearchResources(resources, persistedWorksheets),
    [persistedWorksheets, resources]
  );
  const unfilteredResults = useMemo(
    () => searchResources(searchableResources, submittedQuery, { sessionContext }),
    [searchableResources, sessionContext, submittedQuery]
  );
  const availableTypes = useMemo(
    () => [...new Set(unfilteredResults.map(({ resource }) => resource.type))].sort(),
    [unfilteredResults]
  );
  const effectiveTypeFilter = availableTypes.includes(typeFilter) ? typeFilter : "all";
  const results = useMemo(
    () =>
      effectiveTypeFilter === "all"
        ? unfilteredResults
        : unfilteredResults.filter(
            ({ resource }) => resource.type === effectiveTypeFilter
          ),
    [effectiveTypeFilter, unfilteredResults]
  );

  function runSearch(nextQuery) {
    setQuery(nextQuery);
    setSubmittedQuery(nextQuery);
    setTypeFilter("all");
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSubmittedQuery(query);
    setTypeFilter("all");
  }

  function handleSearchKeyDown(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    runSearch(query);
  }

  function clearSearch() {
    setQuery("");
    setSubmittedQuery("");
    setTypeFilter("all");
  }

  return (
    <>
      <section className="search-section" id="universal-search">
        <form aria-label="Search all resources" onSubmit={handleSubmit}>
          <label className="search-label" htmlFor="therapy-search">
            What do you need right now?
          </label>

          <div className="search-field">
            <Search aria-hidden="true" size={22} />
            <input
              id="therapy-search"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
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
        {worksheetSourceStatus === "loading" ? (
          <p className="resource-search-source-status" role="status">
            Adding saved Worksheets to Search…
          </p>
        ) : null}
        {worksheetSourceStatus === "error" ? (
          <p className="resource-search-source-status" role="status">
            Saved Worksheets are unavailable in Search right now. Prompt Decks and
            Interventions are still available.
          </p>
        ) : null}
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

          {availableTypes.length > 1 ? (
            <label className="resource-search-type-filter">
              Resource Type
              <select
                onChange={(event) => setTypeFilter(event.target.value)}
                value={effectiveTypeFilter}
              >
                <option value="all">All Types</option>
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === "prompt-deck"
                      ? "Prompt Decks"
                      : `${type.charAt(0).toUpperCase()}${type.slice(1)}s`}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {results.length ? (
            <div className="resource-search-results__list">
              {results.map((result) => (
                <ResourceSearchResult
                  key={getResourceKey(result.resource)}
                  result={result}
                />
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
