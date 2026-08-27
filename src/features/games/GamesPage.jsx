import { Brain, Brush, Copy, Download, Pencil, Play, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { EmptyState, Page } from "../../components/layout";
import { bingoRepository, triviaRepository } from "../../lib/data";
import ResourceCompatibilityIndicators from "../clients/ResourceCompatibilityIndicators";
import { IconRenderer } from "../icons";
import { downloadTriviaSet } from "./downloadTriviaSet";
import NewTriviaSetForm from "./NewTriviaSetForm";
import NewBingoSetForm from "./NewBingoSetForm";
import TriviaImportPanel from "./TriviaImportPanel";
import "./GamesPage.css";

async function loadGameSets(triviaDataRepository, bingoDataRepository) {
  const results = await Promise.allSettled([
    triviaDataRepository.getAllTriviaSets(),
    bingoDataRepository.getAllBingoSets(),
  ]);
  return {
    games: results.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    ),
    hadError: results.some(({ status }) => status === "rejected"),
  };
}

export default function GamesPage({
  repository = triviaRepository,
  bingoDataRepository = bingoRepository,
  onExport = downloadTriviaSet,
}) {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [status, setStatus] = useState("loading");
  const [creating, setCreating] = useState(false);
  const [creatingBingo, setCreatingBingo] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const result = await loadGameSets(repository, bingoDataRepository);
    setGames(result.games);
    setStatus(result.hadError ? "error" : "ready");
  }, [bingoDataRepository, repository]);

  useEffect(() => {
    let active = true;
    loadGameSets(repository, bingoDataRepository)
      .then((result) => {
        if (!active) return;
        setGames(result.games);
        setStatus(result.hadError ? "error" : "ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [bingoDataRepository, repository]);

  const starters = games.filter(({ starter }) => starter);
  const therapistSets = games.filter(({ starter }) => !starter);

  async function duplicate(game) {
    setError("");
    try {
      const copy =
        game.gameKind === "bingo"
          ? await bingoDataRepository.duplicateBingoSet(game.id)
          : await repository.duplicateTriviaSet(game.id);
      await refresh();
      navigate(
        game.gameKind === "bingo"
          ? `/games/${copy.id}/bingo-edit`
          : `/games/${copy.id}/edit`
      );
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function remove(game) {
    if (!window.confirm(`Delete “${game.title}”? This cannot be undone.`)) return;
    setError("");
    try {
      if (game.gameKind === "bingo") await bingoDataRepository.deleteBingoSet(game.id);
      else await repository.deleteTriviaSet(game.id);
      await refresh();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  function cards(items) {
    return (
      <div className="games-library__grid">
        {items.map((game) => (
          <article className="game-set-card" key={game.id}>
            <IconRenderer iconId={game.iconId} size={36} />
            <div>
              <span className="resource-type-badge">
                {game.gameKind === "bingo" ? "Bingo" : "Trivia"}
              </span>
              <h3>{game.title}</h3>
              <p>{game.description}</p>
            </div>
            <dl className="game-set-card__details">
              <div>
                <dt>{game.gameKind === "bingo" ? "Items" : "Questions"}</dt>
                <dd>
                  {game.gameKind === "bingo" ? game.items.length : game.questions.length}
                </dd>
              </div>
              {game.gameKind === "bingo" ? (
                <div>
                  <dt>Board</dt>
                  <dd>
                    {game.boardSize}×{game.boardSize}
                  </dd>
                </div>
              ) : (
                <div>
                  <dt>Difficulty</dt>
                  <dd>{game.difficulty}</dd>
                </div>
              )}
              {game.category ? (
                <div>
                  <dt>Category</dt>
                  <dd>{game.category}</dd>
                </div>
              ) : null}
            </dl>
            <ResourceCompatibilityIndicators resource={game} />
            <div className="game-set-card__actions">
              <Link
                className="studio-button studio-button--primary"
                to={`/games/${encodeURIComponent(game.id)}`}
              >
                <Play aria-hidden="true" size={18} />
                {game.gameKind === "bingo" ? "Play Bingo" : "Play Trivia"}
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
                    to={
                      game.gameKind === "bingo"
                        ? `/games/${encodeURIComponent(game.id)}/bingo-edit`
                        : `/games/${encodeURIComponent(game.id)}/edit`
                    }
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
                  {game.gameKind === "trivia" ? <button
                    className="studio-button studio-button--secondary"
                    onClick={() => onExport(game)}
                    type="button"
                  >
                    <Download aria-hidden="true" size={17} />
                    Export JSON
                  </button> : null}
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
        <div className="games-library__page-actions">
          <button
            className="studio-button studio-button--secondary"
            onClick={() => setCreatingBingo(true)}
            type="button"
          >
            <Plus aria-hidden="true" size={18} />
            New Bingo Set
          </button>
          <button
            className="studio-button studio-button--secondary"
            onClick={() => setImporting(true)}
            type="button"
          >
            <Upload aria-hidden="true" size={18} />
            Import Trivia
          </button>
          <button
            className="studio-button studio-button--primary"
            onClick={() => setCreating(true)}
            type="button"
          >
            <Plus aria-hidden="true" size={18} />
            New Trivia Set
          </button>
        </div>
      }
      className="games-library"
      description="Choose a calm, screen-share-friendly game for the session."
      title="Games"
    >
      {status === "loading" ? <p role="status">Loading saved Games…</p> : null}
      {status === "error" ? (
        <p role="status">Saved Games are unavailable. Starter games are still ready.</p>
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
      {creatingBingo ? (
        <NewBingoSetForm
          onCancel={() => setCreatingBingo(false)}
          onCreate={async (input) => {
            const created = await bingoDataRepository.createBingoSet(input);
            await refresh();
            navigate(`/games/${created.id}/bingo-edit`);
          }}
        />
      ) : null}
      {importing ? (
        <TriviaImportPanel
          onClose={() => setImporting(false)}
          onImported={refresh}
          repository={repository}
        />
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <section className="games-library__tools">
        <h2>Creative Tools</h2>
        <article className="game-set-card game-set-card--prompt-path">
          <Sparkles aria-hidden="true" size={36} />
          <div>
            <span className="resource-type-badge">Live game</span>
            <h3>Prompt Path</h3>
            <p>Pick prompt decks, spin, move a shared token, and explore the next question.</p>
          </div>
          <div className="game-set-card__actions">
            <Link className="studio-button studio-button--primary" to="/games/prompt-spinner">
              Play Prompt Path
            </Link>
          </div>
        </article>
        <article className="game-set-card game-set-card--spot-it"><Sparkles aria-hidden="true" size={36} /><div><span className="resource-type-badge">Matching game</span><h3>Spot It</h3><p>Find the one symbol both cards share.</p></div><div className="game-set-card__actions"><Link className="studio-button studio-button--primary" to="/games/spot-it">Play Spot It</Link></div></article>
        <article className="game-set-card game-set-card--memory"><Brain aria-hidden="true" size={36} /><div><span className="resource-type-badge">Live matching game</span><h3>Memory Match</h3><p>Find pairs together, in the same room or from two computers.</p></div><div className="game-set-card__actions"><Link className="studio-button studio-button--primary" to="/games/memory">Play Memory</Link></div></article>
        <article className="game-set-card game-set-card--visual-games">
          <Play aria-hidden="true" size={36} />
          <div>
            <span className="resource-type-badge">Visual games</span>
            <h3>Find, Circle &amp; Explore</h3>
            <p>Browse your licensed Find the Difference, I Spy, matching, and seek-and-find sets.</p>
          </div>
          <div className="game-set-card__actions">
            <Link className="studio-button studio-button--primary" to="/games/visual">
              Browse Visual Games
            </Link>
          </div>
        </article>
        <article className="game-set-card">
          <Brush aria-hidden="true" size={36} />
          <div>
            <span className="resource-type-badge">Tool</span>
            <h3>Whiteboard</h3>
            <p>Draw, write, and add curated visuals during a session.</p>
          </div>
          <div className="game-set-card__actions">
            <Link className="studio-button studio-button--primary" to="/whiteboard">
              Open Whiteboard
            </Link>
          </div>
        </article>
      </section>
      {games.length ? (
        <div className="games-library__sections">
          {therapistSets.length ? (
            <section>
              <h2>My Game Sets</h2>
              {cards(therapistSets)}
            </section>
          ) : null}
          <section>
            <h2>Therapy Studio Starter Games</h2>
            {cards(starters)}
          </section>
        </div>
      ) : (
        <EmptyState
          description="Add a game when you are ready to play."
          title="No Games Yet"
        />
      )}
    </Page>
  );
}
