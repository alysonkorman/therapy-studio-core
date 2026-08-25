import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { EmptyState, Page } from "../../components/layout";
import { bingoSets, triviaSets } from "../../data/resources";
import { getResourceById, resourceMemoryRepository } from "../../lib/data";
import { gameResourceSchema } from "../../models";
import ResourceMemoryControls from "../resource-memory/ResourceMemoryControls";
import BingoSession from "./BingoSession";
import TriviaSession from "./TriviaSession";
import "./GamesPage.css";

const defaultRepository = { getResourceById };
const starters = [...triviaSets, ...bingoSets];

export default function GamePage({
  gameId: suppliedId,
  memoryRepository = resourceMemoryRepository,
  repository = defaultRepository,
  starterGames = starters,
}) {
  const { gameId: routeId } = useParams();
  const gameId = suppliedId ?? routeId;
  const starter = starterGames.find(({ id }) => id === gameId);
  const [loaded, setLoaded] = useState({ game: null, gameId: null, status: "loading" });
  const game = starter ?? (loaded.gameId === gameId ? loaded.game : null);
  const status = starter ? "ready" : loaded.gameId === gameId ? loaded.status : "loading";
  const useReported = useRef(false);

  useEffect(() => {
    useReported.current = false;
  }, [gameId]);

  useEffect(() => {
    if (starter) return undefined;
    let active = true;
    repository
      .getResourceById(gameId)
      .then((resource) => {
        const { archived, ...candidate } = resource;
        const result = gameResourceSchema.safeParse(candidate);
        if (!active) return;
        setLoaded(
          result.success && !archived
            ? { game: result.data, gameId, status: "ready" }
            : { game: null, gameId, status: "missing" }
        );
      })
      .catch(() => {
        if (active) setLoaded({ game: null, gameId, status: "missing" });
      });
    return () => {
      active = false;
    };
  }, [gameId, repository, starter]);

  const reportUse = useCallback(() => {
    if (useReported.current || !game) return;
    useReported.current = true;
    void memoryRepository.markResourceUsed(game.id).catch(() => {});
  }, [game, memoryRepository]);

  if (status === "loading")
    return (
      <Page title="Game">
        <p role="status">Loading Game…</p>
      </Page>
    );
  if (status === "missing" || !game)
    return (
      <Page title="Game Not Found">
        <EmptyState
          action={
            <Link className="studio-button studio-button--primary" to="/games">
              Back to Games
            </Link>
          }
          description="The game may have moved or the link may be outdated."
          title="We Couldn’t Find That Game"
        />
      </Page>
    );

  return (
    <Page
      actions={
        <Link className="studio-button studio-button--secondary" to="/games">
          <ArrowLeft aria-hidden="true" size={17} />
          Back to Games
        </Link>
      }
      className={`${game.gameKind}-game-page`}
      description={game.description}
      title={game.title}
    >
      {game.gameKind === "bingo" ? (
        <BingoSession game={game} onMeaningfulUse={reportUse} />
      ) : (
        <TriviaSession game={game} onMeaningfulUse={reportUse} />
      )}
      <ResourceMemoryControls
        repository={memoryRepository}
        resourceId={game.id}
        showEditor
        therapistOnly
      />
    </Page>
  );
}
