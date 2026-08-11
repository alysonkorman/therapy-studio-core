import { Gamepad2, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { EmptyState, Page } from "../../components/layout";
import { triviaSets } from "../../data/resources";
import { getAllResources } from "../../lib/data";
import ResourceCompatibilityIndicators from "../clients/ResourceCompatibilityIndicators";
import "./GamesPage.css";

const defaultRepository = { getAllResources };

function combineTriviaSets(starters, persisted) {
  const sets = new Map(starters.map((set) => [set.id, set]));
  persisted
    .filter((resource) => !resource.archived && resource.gameKind === "trivia")
    .forEach((resource) => sets.set(resource.id, resource));
  return [...sets.values()].sort((first, second) =>
    first.title.localeCompare(second.title)
  );
}

export default function GamesPage({
  repository = defaultRepository,
  starters = triviaSets,
}) {
  const [persisted, setPersisted] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;
    repository
      .getAllResources()
      .then((resources) => {
        if (!active) return;
        setPersisted(resources.filter(({ type }) => type === "game"));
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [repository]);

  const games = useMemo(
    () => combineTriviaSets(starters, persisted),
    [persisted, starters]
  );

  return (
    <Page
      className="games-library"
      description="Choose a calm, screen-share-friendly game for the session."
      title="Games"
    >
      {status === "loading" ? <p role="status">Loading saved Trivia Sets…</p> : null}
      {status === "error" ? (
        <p role="status">
          Saved Trivia Sets are unavailable. Starter games are still ready.
        </p>
      ) : null}
      {games.length ? (
        <div className="games-library__grid">
          {games.map((game) => (
            <article className="trivia-set-card" key={game.id}>
              <Gamepad2 aria-hidden="true" size={30} />
              <div>
                <span className="resource-type-badge">Trivia</span>
                <h2>{game.title}</h2>
                <p>{game.description}</p>
              </div>
              <dl className="trivia-set-card__details">
                <div>
                  <dt>Questions</dt>
                  <dd>{game.questions.length}</dd>
                </div>
                <div>
                  <dt>Difficulty</dt>
                  <dd>{game.difficulty}</dd>
                </div>
                {game.category ? (
                  <div>
                    <dt>Category</dt>
                    <dd>{game.category}</dd>
                  </div>
                ) : null}
              </dl>
              <ResourceCompatibilityIndicators resource={game} />
              <Link
                className="studio-button studio-button--primary"
                to={`/games/${encodeURIComponent(game.id)}`}
              >
                <Play aria-hidden="true" size={18} />
                Play Trivia
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          description="Add a Trivia Set when you are ready to play."
          title="No Trivia Sets Yet"
        />
      )}
    </Page>
  );
}
