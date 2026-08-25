import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ResourceCard from "../../components/ResourceCard";
import { EmptyState, Page, Section } from "../../components/layout";
import { resourceMemoryRepository } from "../../lib/data";
import { getResourceKey } from "../../models";
import PromptDeckCard from "../prompts/PromptDeckCard";
import "./SavedPage.css";

const sections = [
  ["Favorites", "getFavoriteResources"],
  ["Recently Used", "getRecentlyUsedResources"],
  ["Most Used", "getMostUsedResources"],
  ["Highest Rated", "getHighestRatedResources"],
];

function MemoryResource({ item, onChange, repository }) {
  const destinationByType = {
    game: {
      label: item.resource.gameKind === "bingo" ? "Play Bingo" : "Play Trivia",
      path: `/games/${encodeURIComponent(item.resource.id)}`,
    },
    intervention: {
      label: "Open Intervention",
      path: `/interventions/${encodeURIComponent(item.resource.id)}`,
    },
    worksheet: {
      label: "Open Worksheet",
      path: `/worksheets/${encodeURIComponent(item.resource.id)}`,
    },
  };
  const destination = destinationByType[item.resource.type];
  return item.resource.type === "prompt-deck" ? (
    <PromptDeckCard
      deck={item.resource}
      memoryRepository={repository}
      onMemoryChange={onChange}
    />
  ) : (
    <ResourceCard
      actions={
        destination ? (
          <Link className="saved-page__resource-link" to={destination.path}>
            {destination.label}
          </Link>
        ) : null
      }
      memoryRepository={repository}
      onMemoryChange={onChange}
      resource={item.resource}
    />
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
    <Page
      className="saved-page"
      description="Return to resources you favorited, rated, or used in sessions."
      title="Saved"
    >
      {error ? <p role="alert">{error}</p> : null}
      {sections.map(([title]) => {
        const items = collections[title] ?? [];
        return (
          <Section className="saved-page__section" key={title} title={title}>
            {items.length ? (
              <div className="saved-page__grid">
                {items.map((item) => (
                  <MemoryResource
                    item={item}
                    key={getResourceKey(item.resource)}
                    onChange={refresh}
                    repository={repository}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                description="Resources will appear here as you use Therapy Studio."
                headingLevel={3}
                title={`No ${title} Yet`}
              />
            )}
          </Section>
        );
      })}
    </Page>
  );
}
