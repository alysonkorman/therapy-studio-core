import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ResourceCard from "../../components/ResourceCard";
import { resourceMemoryRepository } from "../../lib/data";
import PromptDeckCard from "../prompts/PromptDeckCard";
import "./SavedPage.css";

const sections = [
  ["Favorites", "getFavoriteResources"],
  ["Recently Used", "getRecentlyUsedResources"],
  ["Most Used", "getMostUsedResources"],
  ["Highest Rated", "getHighestRatedResources"],
];

function MemoryResource({ item, onChange, repository }) {
  return item.resource.type === "prompt-deck" ? (
    <PromptDeckCard
      deck={item.resource}
      memoryRepository={repository}
      onMemoryChange={onChange}
    />
  ) : (
    <div>
      <ResourceCard
        memoryRepository={repository}
        onMemoryChange={onChange}
        resource={item.resource}
      />
      <Link className="saved-page__resource-link" to="/interventions">
        Open Intervention Library
      </Link>
    </div>
  );
}

export default function SavedPage({ repository = resourceMemoryRepository }) {
  const [collections, setCollections] = useState({});
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const results = await Promise.all(
        sections.map(async ([title, method]) => [title, await repository[method]()])
      );
      setCollections(Object.fromEntries(results));
      setError("");
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }, [repository]);

  useEffect(() => {
    let active = true;
    Promise.all(
      sections.map(async ([title, method]) => [title, await repository[method]()])
    )
      .then((results) => {
        if (active) setCollections(Object.fromEntries(results));
      })
      .catch((caughtError) => {
        if (active) setError(caughtError.message);
      });
    return () => {
      active = false;
    };
  }, [repository]);

  return (
    <div className="saved-page">
      <header>
        <p className="eyebrow">Therapist Resource Memory</p>
        <h1>Saved</h1>
        <p>Return to resources you favorited, rated, or used in sessions.</p>
      </header>
      {error ? <p role="alert">{error}</p> : null}
      {sections.map(([title]) => {
        const items = collections[title] ?? [];
        return (
          <section className="saved-page__section" key={title}>
            <h2>{title}</h2>
            {items.length ? (
              <div className="saved-page__grid">
                {items.map((item) => (
                  <MemoryResource
                    item={item}
                    key={item.memory.resourceId}
                    onChange={refresh}
                    repository={repository}
                  />
                ))}
              </div>
            ) : (
              <p className="saved-page__empty">No resources here yet.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
