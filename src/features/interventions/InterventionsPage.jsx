import { Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EmptyState, Page } from "../../components/layout";
import { interventions as starterInterventions } from "../../data/resources";
import { filterInterventions } from "../../engines/interventions/filterInterventions";
import { interventionRepository, resourceMemoryRepository } from "../../lib/data";
import InterventionImportPanel from "./InterventionImportPanel";
import InterventionLibraryCard from "./InterventionLibraryCard";
import "./InterventionsPage.css";

export default function InterventionsPage({
  memoryRepository = resourceMemoryRepository,
  repository = interventionRepository,
}) {
  const [interventions, setInterventions] = useState(() =>
    starterInterventions.map((item) => ({ ...item, archived: false, starter: true }))
  );
  const [sourceStatus, setSourceStatus] = useState("loading");
  const [showImport, setShowImport] = useState(false);
  const [query, setQuery] = useState("");
  const [goal, setGoal] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [maxDuration, setMaxDuration] = useState("");
  const [telehealthOnly, setTelehealthOnly] = useState(false);
  const loadInterventions = useCallback(async () => {
    try {
      setInterventions(await repository.getAllInterventions());
      setSourceStatus("ready");
    } catch {
      setSourceStatus("error");
    }
  }, [repository]);

  useEffect(() => {
    let active = true;
    repository
      .getAllInterventions()
      .then((items) => {
        if (!active) return;
        setInterventions(items);
        setSourceStatus("ready");
      })
      .catch(() => {
        if (active) setSourceStatus("error");
      });
    return () => {
      active = false;
    };
  }, [repository]);

  const goals = useMemo(
    () => [...new Set(interventions.flatMap((item) => item.goals))].sort(),
    [interventions]
  );
  const ageRanges = useMemo(
    () => [...new Set(interventions.flatMap((item) => item.ageRanges))],
    [interventions]
  );
  const visibleInterventions = useMemo(
    () =>
      filterInterventions(interventions, {
        query,
        goal,
        ageRange,
        maxDuration,
        telehealthOnly,
      }),
    [ageRange, goal, interventions, maxDuration, query, telehealthOnly]
  );
  const hasFilters = Boolean(query || goal || ageRange || maxDuration || telehealthOnly);

  function clearFilters() {
    setQuery("");
    setGoal("");
    setAgeRange("");
    setMaxDuration("");
    setTelehealthOnly(false);
  }

  async function deleteIntervention(intervention) {
    if (!window.confirm(`Delete “${intervention.title}”? This cannot be undone.`)) return;
    await repository.deleteInterventionPermanently(intervention.id);
    await loadInterventions();
  }

  return (
    <Page
      className="interventions-page"
      description="Browse concise, therapist-ready activities for live telehealth sessions."
      title="Interventions"
    >
      <div className="intervention-library-tools">
        <button
          className="studio-button studio-button--secondary"
          onClick={() => setShowImport((value) => !value)}
          type="button"
        >
          Import Interventions
        </button>
      </div>
      {showImport ? (
        <InterventionImportPanel
          onCancel={() => setShowImport(false)}
          onImported={loadInterventions}
          repository={repository}
        />
      ) : null}
      {sourceStatus === "loading" ? <p role="status">Loading Interventions…</p> : null}
      {sourceStatus === "error" ? (
        <p role="alert">Interventions are unavailable right now.</p>
      ) : null}
      <section className="intervention-filters" aria-label="Filter Interventions">
        <label className="intervention-search">
          <span>Search Interventions</span>
          <span className="intervention-search__field">
            <Search aria-hidden="true" size={18} />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, goal, tag, or clinical fit"
              type="search"
              value={query}
            />
          </span>
        </label>
        <label>
          Goal or Topic
          <select onChange={(event) => setGoal(event.target.value)} value={goal}>
            <option value="">All Goals</option>
            {goals.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Age Fit
          <select onChange={(event) => setAgeRange(event.target.value)} value={ageRange}>
            <option value="">All Ages</option>
            {ageRanges.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Duration
          <select
            onChange={(event) => setMaxDuration(event.target.value)}
            value={maxDuration}
          >
            <option value="">Any Length</option>
            <option value="10">10 minutes or less</option>
            <option value="15">15 minutes or less</option>
            <option value="20">20 minutes or less</option>
          </select>
        </label>
        <label className="intervention-checkbox">
          <input
            checked={telehealthOnly}
            onChange={(event) => setTelehealthOnly(event.target.checked)}
            type="checkbox"
          />
          Telehealth Friendly
        </label>
        {hasFilters ? (
          <button
            className="studio-button studio-button--secondary"
            onClick={clearFilters}
            type="button"
          >
            <X aria-hidden="true" size={16} />
            Clear Filters
          </button>
        ) : null}
      </section>

      <p className="intervention-results-count" role="status">
        {visibleInterventions.length}{" "}
        {visibleInterventions.length === 1 ? "Intervention" : "Interventions"}
      </p>
      {visibleInterventions.length ? (
        <div className="intervention-library-grid">
          {visibleInterventions.map((item) => (
            <InterventionLibraryCard
              intervention={item}
              key={item.id}
              memoryRepository={memoryRepository}
              onDelete={item.starter ? undefined : () => deleteIntervention(item)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          action={
            hasFilters ? (
              <button
                className="studio-button studio-button--secondary"
                onClick={clearFilters}
                type="button"
              >
                Clear Filters
              </button>
            ) : null
          }
          description="Try a broader search or clear one of the filters."
          title="No Interventions Match"
        />
      )}
    </Page>
  );
}
