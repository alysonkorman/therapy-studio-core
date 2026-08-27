import { nanoid } from "nanoid";
import { ArrowLeft, Maximize2, Minimize2, RotateCcw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Page } from "../../components/layout";
import { createLiveSession } from "../../models/liveSession";
import LiveSessionPanel from "../live-sessions/LiveSessionPanel";
import { useSharedSession } from "../live-sessions/SharedSessionProvider";
import { useLiveSession } from "../live-sessions/useLiveSession";
import {
  createRemoteLiveSession,
  endRemoteLiveSession,
  getHostRoomCredential,
  participantUrlForActivity,
} from "../live-sessions/liveSessionApi";
import { createProductionWebSocketTransport } from "../live-sessions/productionWebSocketTransport";
import {
  captureCognitoHostToken,
  consumePendingLiveSessionInvite,
  getCognitoHostToken,
  hasConfiguredLiveSessionBackend,
  liveSessionLoginUrl,
  rememberPendingLiveSessionInvite,
} from "../live-sessions/liveSessionHostAuth";
import { spotItLiveSessionAdapter } from "./spotItLiveSessionAdapter";
import {
  applySpotItAction,
  createSpotItGame,
  matchingSymbol,
  progress,
  symbolPresentation,
  visibleCards,
} from "./spotItGame";
import { spotItSymbols } from "./gameThemeAssets";
import "./GamesPage.css";

const symbols = spotItSymbols;
const symbolById = Object.fromEntries(symbols.map((symbol) => [symbol.id, symbol]));
const spotItThemes = [
  { id: "assorted", label: "Assorted", symbolIds: symbols.map(({ id }) => id) },
].filter((theme) => new Set(theme.symbolIds).size >= 57);
const themeFor = (id) => spotItThemes.find((theme) => theme.id === id) ?? spotItThemes[0];
const newGame = (themeId = "assorted") => {
  const theme = themeFor(themeId);
  return createSpotItGame({ symbolIds: theme.symbolIds.slice(0, 57), theme: theme.id });
};

export default function SpotItPage({
  createId = () => nanoid(),
  liveSession: suppliedLiveSession = null,
  sharedRoom = null,
  sharedRole = null,
  onSharedRoomAction = null,
}) {
  const appSharedSession = useSharedSession();
  const roomBridge = sharedRoom
    ? { room: sharedRoom, role: sharedRole, send: onSharedRoomAction }
    : appSharedSession?.session && appSharedSession.room.activityKind === "spot-it"
      ? { room: appSharedSession.room, role: "host", send: appSharedSession.update }
      : null;
  const [shared, setShared] = useState(newGame);
  const [hostLiveSession, setHostLiveSession] = useState(null);
  const [message, setMessage] = useState("");
  const [newGameConfirmation, setNewGameConfirmation] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pendingInviteHandled = useRef(false);
  const activeLiveSession = suppliedLiveSession ?? hostLiveSession;
  const participantMode =
    roomBridge?.role === "participant" || activeLiveSession?.role === "participant";
  const sharedRoomState = roomBridge?.room.activityStates["spot-it"];
  const roomPermission = roomBridge?.room.permission;
  const productionTransportFactory = useMemo(
    () =>
      activeLiveSession?.credential
        ? (options) =>
            createProductionWebSocketTransport({
              ...options,
              credential: activeLiveSession.credential,
            })
        : undefined,
    [activeLiveSession?.credential]
  );
  const live = useLiveSession({
    adapter: spotItLiveSessionAdapter,
    onRemoteState: setShared,
    role: activeLiveSession?.role,
    sessionId: activeLiveSession?.sessionId,
    sharedState: shared,
    transportFactory: productionTransportFactory,
  });
  useEffect(() => {
    if (sharedRoomState) setShared(sharedRoomState);
  }, [sharedRoomState]);
  const replace = useCallback(
    (next) => {
      if (roomBridge) {
        roomBridge.send({
          type: "room/spot-it-action",
          action: { type: "spot-it/replace", state: next },
        });
        return;
      }
      setShared(next);
      live.publishState(next);
    },
    [live, roomBridge]
  );
  useEffect(() => {
    if (!shared.feedback || participantMode || live.status === "ended") return undefined;
    const timer = window.setTimeout(
      () =>
        replace(
          applySpotItAction(shared, {
            type:
              shared.feedback.type === "match"
                ? "spot-it/advance"
                : "spot-it/clear-feedback",
          })
        ),
      shared.feedback.type === "match" ? 1000 : 450
    );
    return () => window.clearTimeout(timer);
  }, [live.status, participantMode, replace, shared]);
  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);
  const cards = useMemo(() => visibleCards(shared), [shared]);
  const choose = (iconId) => {
    if (shared.complete || shared.feedback || live.status === "ended") return;
    const action = {
      type: iconId === matchingSymbol(shared) ? "spot-it/found" : "spot-it/incorrect",
      player: participantMode ? "participant" : "host",
      symbolId: iconId,
    };
    if (roomBridge) roomBridge.send({ type: "room/spot-it-action", action });
    else if (participantMode) live.requestAction(action);
    else replace(applySpotItAction(shared, action));
  };
  const createSpotItLiveSession = useCallback(async () => {
    if (hasConfiguredLiveSessionBackend()) {
      const token = captureCognitoHostToken();
      if (!token) {
        const login = liveSessionLoginUrl();
        if (login) {
          rememberPendingLiveSessionInvite();
          window.location.assign(login);
        } else setMessage("Sign in to use Live Sessions.");
        return;
      }
      try {
        const created = await createRemoteLiveSession({
          activityKind: "spot-it",
          state: shared,
          token,
        });
        const credential = await getHostRoomCredential({ sessionId: created.id, token });
        setHostLiveSession({
          ...created,
          credential,
          participantUrl: participantUrlForActivity({
            activityKind: "spot-it",
            participantUrl: created.participantUrl,
            siteOrigin: window.location.origin,
          }),
          role: "host",
          sessionId: created.id,
        });
        setMessage("Live Spot It is ready. Copy the participant link.");
      } catch (error) {
        if (error instanceof Error && error.message === "unauthorized") {
          const login = liveSessionLoginUrl();
          if (login) {
            rememberPendingLiveSessionInvite();
            window.location.assign(login);
            return;
          }
          setMessage("Sign in to use Live Sessions.");
          return;
        }
        setMessage("Live Spot It is unavailable. You can continue playing locally.");
      }
      return;
    }
    if (!import.meta.env.DEV) {
      setMessage("Remote Live Sessions are not configured.");
      return;
    }
    const created = createLiveSession({
      activityKind: "spot-it",
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      id: createId(),
    });
    setHostLiveSession({
      ...created,
      participantUrl: `${window.location.origin}/join/${encodeURIComponent(created.id)}#activity=spot-it`,
      role: "host",
      sessionId: created.id,
    });
    setMessage("Local Live Spot It is ready for a second tab.");
  }, [createId, shared]);
  useEffect(() => {
    if (
      participantMode ||
      pendingInviteHandled.current ||
      !hasConfiguredLiveSessionBackend() ||
      !captureCognitoHostToken() ||
      !consumePendingLiveSessionInvite()
    )
      return;
    pendingInviteHandled.current = true;
    void createSpotItLiveSession();
  }, [createSpotItLiveSession, participantMode]);
  async function endSession() {
    if (hostLiveSession?.credential) {
      try {
        await endRemoteLiveSession({
          sessionId: hostLiveSession.sessionId,
          token: getCognitoHostToken(),
        });
      } catch {
        /* client session still closes */
      }
    }
    live.endSession();
    setHostLiveSession(null);
    setMessage("Live Spot It ended.");
  }
  if (participantMode && live.status === "ended")
    return (
      <main className="live-session-status">
        <h1>Session ended</h1>
        <p>This Spot It session has ended.</p>
      </main>
    );
  return (
    <Page
      actions={
        !participantMode ? (
          <Link className="studio-button studio-button--secondary" to="/games">
            <ArrowLeft size={17} /> Back to Games
          </Link>
        ) : null
      }
      className="spot-it-page"
      description="Find the one symbol both cards share."
      title="Spot It"
    >
      <section className={`spot-it${isFullscreen ? " spot-it--fullscreen" : ""}`}>
        {!participantMode ? (
          <div className="spot-it__controls">
            <label>
              Theme
              <select
                onChange={(event) => replace(newGame(event.target.value))}
                value={shared.theme}
              >
                {spotItThemes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="studio-button studio-button--secondary"
              onClick={() => setNewGameConfirmation(true)}
              type="button"
            >
              <RotateCcw size={17} /> New Game
            </button>
            {appSharedSession?.session && !roomBridge ? (
              <button
                className="studio-button studio-button--primary"
                onClick={() =>
                  appSharedSession.update({
                    type: "room/select-activity",
                    activityKind: "spot-it",
                    state: shared,
                  })
                }
                type="button"
              >
                Start with Child
              </button>
            ) : null}
            <LiveSessionPanel
              onCopy={async () => {
                try {
                  await navigator.clipboard?.writeText(hostLiveSession.participantUrl);
                  setMessage("Participant link copied.");
                } catch {
                  setMessage("Copy the participant link shown above.");
                }
              }}
              onCreate={() => void createSpotItLiveSession()}
              onEnd={() => void endSession()}
              participantState={live.participantState}
              session={hostLiveSession}
            />
            <button
              className="studio-button studio-button--secondary"
              onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                else void document.documentElement.requestFullscreen();
              }}
              type="button"
            >
              {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />} Full
              Screen
            </button>
          </div>
        ) : null}
        {newGameConfirmation ? (
          <div
            className="spot-it__confirmation"
            role="dialog"
            aria-label="Start a new game"
          >
            <strong>Start a new game?</strong>
            <div>
              <button
                className="studio-button studio-button--secondary"
                onClick={() => setNewGameConfirmation(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="studio-button studio-button--primary"
                onClick={() => {
                  replace(newGame(shared.theme));
                  setNewGameConfirmation(false);
                }}
                type="button"
              >
                New Game
              </button>
            </div>
          </div>
        ) : null}
        <p className="spot-it__instruction">
          Find the one matching picture on both cards.
        </p>
        <div className="spot-it__status">
          <span>{themeFor(shared.theme).label}</span>
          <strong>Score {shared.score}</strong>
          <span>{progress(shared)} / 57</span>
        </div>
        {shared.complete ? (
          <div className="spot-it__complete" role="status">
            <Sparkles size={24} />
            <div>
              <strong>Game Complete</strong>
              <span>Final score: {shared.score}</span>
            </div>
            {!participantMode ? (
              <div>
                <button
                  className="studio-button studio-button--primary"
                  onClick={() => replace(newGame(shared.theme))}
                  type="button"
                >
                  Play Again
                </button>
                <button
                  className="studio-button studio-button--secondary"
                  onClick={() => setNewGameConfirmation(true)}
                  type="button"
                >
                  Choose Theme
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="spot-it__cards">
            {cards.map((card, cardIndex) => (
              <div
                aria-label={`Spot It card ${cardIndex + 1}`}
                className="spot-it__card"
                key={cardIndex}
              >
                {card.map((symbolId, index) => {
                  const symbol = symbolById[symbolId];
                  const feedback = shared.feedback;
                  const isCorrect =
                    feedback?.type === "match" && feedback.symbolId === symbolId;
                  const isIncorrect =
                    feedback?.type === "incorrect" && feedback.symbolId === symbolId;
                  return (
                    <button
                      aria-label="Choose picture"
                      className={`spot-it__symbol${isCorrect ? " spot-it__symbol--correct" : ""}${isIncorrect ? " spot-it__symbol--incorrect" : ""}`}
                      disabled={
                        live.status === "ended" ||
                        Boolean(shared.feedback) ||
                        (participantMode && roomPermission === "watch")
                      }
                      key={symbolId}
                      onClick={() => choose(symbolId)}
                      style={symbolPresentation({
                        cardIndex: shared.currentIndex + cardIndex,
                        index,
                        symbolId,
                      })}
                      type="button"
                    >
                      <img
                        aria-hidden="true"
                        alt=""
                        className="spot-it__art"
                        src={symbol?.image}
                      />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        {shared.feedback?.type === "match" ? (
          <p className="spot-it__found" role="status">
            <Sparkles size={20} /> Match!
          </p>
        ) : null}
        {message ? <p role="status">{message}</p> : null}
      </section>
    </Page>
  );
}
