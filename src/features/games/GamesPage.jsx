import { Copy, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { EmptyState, Page } from "../../components/layout";
import { triviaRepository } from "../../lib/data";
import ResourceCompatibilityIndicators from "../clients/ResourceCompatibilityIndicators";
import { IconRenderer } from "../icons";
import NewTriviaSetForm from "./NewTriviaSetForm";
import "./GamesPage.css";

export default function GamesPage({ repository = triviaRepository }) {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [status, setStatus] = useState("loading");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const values = await repository.getAllTriviaSets();
    setGames(values);
    setStatus("ready");
  }, [repository]);

  useEffect(() => {
    let active = true;
    repository
      .getAllTriviaSets()
      .then((values) => {
        if (!active) return;
        setGames(values);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [repository]);

  const starters = games.filter(({ starter }) => starter);
  const therapistSets = games.filter(({ starter }) => !starter);

  async function duplicate(game) {
    setError("");
    try {
      const copy = await repository.duplicateTriviaSet(game.id);
      await refresh();
      navigate(`/games/${copy.id}/edit`);
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function remove(game) {
    if (!window.confirm(`Delete “${game.title}”? This cannot be undone.`)) return;
    setError("");
    try {
      await repository.deleteTriviaSet(game.id);
      await refresh();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  function cards(items) {
    return (
      <div className="games-library__grid">
        {items.map((game) => (
          <article className="trivia-set-card" key={game.id}>
            <IconRenderer iconId={game.iconId} size={36} />
            <div>
              <span className="resource-type-badge">Trivia</span>
              <h3>{game.title}</h3>
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
            <div className="trivia-set-card__actions">
              <Link
                className="studio-button studio-button--primary"
                to={`/games/${encodeURIComponent(game.id)}`}
              >
                <Play aria-hidden="true" size={18} />
                Play Trivia
              </Link>
              {game.starter ? (
                <button
                  className="studio-button studio-button--secondary"
                  onClick={() => void duplicate(game)}
                  type="button"
                >
                  <Copy aria-hidden="true" size={17} />
                  Duplicate to Edit
                </button>
              ) : (
                <>
                  <Link
                    className="studio-button studio-button--secondary"
                    to={`/games/${encodeURIComponent(game.id)}/edit`}
                  >
                    <Pencil aria-hidden="true" size={17} />
                    Manage
                  </Link>
                  <button
                    className="studio-button studio-button--secondary"
                    onClick={() => void duplicate(game)}
                    type="button"
                  >
                    <Copy aria-hidden="true" size={17} />
                    Duplicate
                  </button>
                  <button
                    className="studio-button studio-button--destructive"
                    onClick={() => void remove(game)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={17} />
                    Delete
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <Page
      actions={
        <button
          className="studio-button studio-button--primary"
          onClick={() => setCreating(true)}
          type="button"
        >
          <Plus aria-hidden="true" size={18} />
          New Trivia Set
        </button>
      }
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
      {creating ? (
        <NewTriviaSetForm
          onCancel={() => setCreating(false)}
          onCreate={async (input) => {
            const created = await repository.createTriviaSet(input);
            await refresh();
            navigate(`/games/${created.id}/edit`);
          }}
        />
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      {games.length ? (
        <div className="games-library__sections">
          {therapistSets.length ? (
            <section>
              <h2>My Trivia Sets</h2>
              {cards(therapistSets)}
            </section>
          ) : null}
          <section>
            <h2>Therapy Studio Starter Trivia</h2>
            {cards(starters)}
          </section>
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
