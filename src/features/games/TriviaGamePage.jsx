import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { EmptyState, Page } from "../../components/layout";
import { triviaSets } from "../../data/resources";
import { getResourceById, resourceMemoryRepository } from "../../lib/data";
import { triviaGameSchema } from "../../models";
import ResourceMemoryControls from "../resource-memory/ResourceMemoryControls";
import TriviaSession from "./TriviaSession";
import "./GamesPage.css";

const defaultRepository = { getResourceById };

export default function TriviaGamePage({
  gameId: suppliedId,
  memoryRepository = resourceMemoryRepository,
  repository = defaultRepository,
  starters = triviaSets,
}) {
  const { gameId: routeId } = useParams();
  const gameId = suppliedId ?? routeId;
  const starter = starters.find(({ id }) => id === gameId);
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
        const result = triviaGameSchema.safeParse(candidate);
        if (!active) return;
        if (result.success && !archived) {
          setLoaded({ game: result.data, gameId, status: "ready" });
        } else setLoaded({ game: null, gameId, status: "missing" });
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
      <Page title="Trivia">
        <p role="status">Loading Trivia Set…</p>
      </Page>
    );
  if (status === "missing" || !game)
    return (
      <Page title="Trivia Set Not Found">
        <EmptyState
          action={
            <Link className="studio-button studio-button--primary" to="/games">
              Back to Games
            </Link>
          }
          description="The set may have moved or the link may be outdated."
          title="We Couldn’t Find That Trivia Set"
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
      className="trivia-game-page"
      description={game.description}
      title={game.title}
    >
      <TriviaSession game={game} onMeaningfulUse={reportUse} />
      <ResourceMemoryControls
        repository={memoryRepository}
        resourceId={game.id}
        showEditor
        therapistOnly
      />
    </Page>
  );
}
