import { nanoid } from "nanoid";
import { ArrowLeft, Maximize2, Minimize2, RotateCcw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Page } from "../../components/layout";
import { createLiveSession } from "../../models/liveSession";
import {
  createRemoteLiveSession,
  endRemoteLiveSession,
  getHostRoomCredential,
  participantUrlForActivity,
} from "../live-sessions/liveSessionApi";
import {
  captureCognitoHostToken,
  consumePendingLiveSessionInvite,
  getCognitoHostToken,
  hasConfiguredLiveSessionBackend,
  liveSessionLoginUrl,
  rememberPendingLiveSessionInvite,
} from "../live-sessions/liveSessionHostAuth";
import LiveSessionPanel from "../live-sessions/LiveSessionPanel";
import { useSharedSession } from "../live-sessions/SharedSessionProvider";
import { createProductionWebSocketTransport } from "../live-sessions/productionWebSocketTransport";
import { useLiveSession } from "../live-sessions/useLiveSession";
import { memoryLiveSessionAdapter } from "./memoryLiveSessionAdapter";
import { gameThemes, themedSymbols } from "./gameThemeAssets";
import {
  advanceMemoryAfterMatch,
  advanceMemoryAfterMismatch,
  applyMemoryAction,
  canFlipMemoryCard,
  completeMemoryGame,
  createMemoryGame,
  memoryDifficulties,
} from "./memoryGame";
import "./GamesPage.css";

const newGame = (theme = "black-cats", difficulty = "medium", startingPlayer = "host") =>
  createMemoryGame({
    difficulty,
    startingPlayer,
    symbols: themedSymbols({ limit: memoryDifficulties[difficulty].pairs, theme }),
    theme,
  });

export default function MemoryGamePage({
  createId = () => nanoid(),
  liveSession: suppliedLiveSession = null,
  sharedRoom = null,
  sharedRole = null,
  onSharedRoomAction = null,
}) {
  const appSharedSession = useSharedSession();
  const roomBridge = sharedRoom
    ? { room: sharedRoom, role: sharedRole, send: onSharedRoomAction }
    : appSharedSession?.session && appSharedSession.room.activityKind === "memory"
      ? { room: appSharedSession.room, role: "host", send: appSharedSession.update }
      : null;
  const [shared, setShared] = useState(newGame);
  const [hostLiveSession, setHostLiveSession] = useState(null);
  const [message, setMessage] = useState("");
  const [theme, setTheme] = useState("black-cats");
  const [difficulty, setDifficulty] = useState("medium");
  const [newGameConfirmation, setNewGameConfirmation] = useState(false);
  const [inviteConfirmation, setInviteConfirmation] = useState(false);
  const [pendingChange, setPendingChange] = useState(null);
  const [startingPlayer, setStartingPlayer] = useState("host");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pendingInviteHandled = useRef(false);
  const activeLiveSession = suppliedLiveSession ?? hostLiveSession;
  const participantMode =
    roomBridge?.role === "participant" || activeLiveSession?.role === "participant";
  const roomMemoryState = roomBridge?.room.activityStates.memory;
  const roomPermission = roomBridge?.room.permission;
  const transportFactory = useMemo(
    () =>
      activeLiveSession?.credential
        ? (options) =>
            createProductionWebSocketTransport({
              ...options,
              credential: activeLiveSession.credential,
            })
        : undefined,
    [activeLiveSession]
  );
  const live = useLiveSession({
    adapter: memoryLiveSessionAdapter,
    onRemoteState: setShared,
    role: activeLiveSession?.role,
    sessionId: activeLiveSession?.sessionId,
    sharedState: shared,
    transportFactory,
  });
  useEffect(() => {
    if (roomMemoryState) {
      setShared(roomMemoryState);
      setTheme(roomMemoryState.theme);
      setDifficulty(roomMemoryState.difficulty);
      setStartingPlayer(roomMemoryState.startingPlayer);
    }
  }, [roomMemoryState]);
  const update = useCallback(
    (next) => {
      if (roomBridge) {
        roomBridge.send({
          type: "room/memory-action",
          action: { type: "memory/replace", state: next },
        });
        return;
      }
      setShared(next);
      live.publishState(next);
    },
    [live, roomBridge]
  );
  const sharedGame = Boolean(activeLiveSession || roomBridge);
  const localPlayer = participantMode ? "participant" : "host";
  const flip = (index) => {
    if (live.status === "ended") return;
    const action = {
      type: "memory/flip",
      index,
      player: localPlayer,
      shared: sharedGame,
    };
    if (!canFlipMemoryCard(shared, action)) return;
    if (roomBridge) roomBridge.send({ type: "room/memory-action", action });
    else if (participantMode) live.requestAction(action);
    else update(applyMemoryAction(shared, action));
  };

  useEffect(() => {
    if (!shared.feedback || participantMode || live.status === "ended") return undefined;
    const isMatch = shared.feedback.type === "match";
    const timer = window.setTimeout(
      () => {
        update(
          isMatch ? advanceMemoryAfterMatch(shared) : advanceMemoryAfterMismatch(shared)
        );
      },
      isMatch ? 700 : 900
    );
    return () => window.clearTimeout(timer);
  }, [live.status, participantMode, shared, update]);

  useEffect(() => {
    const refreshFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", refreshFullscreen);
    return () => document.removeEventListener("fullscreenchange", refreshFullscreen);
  }, []);

  const startNewGame = useCallback(
    (nextTheme = theme, nextDifficulty = difficulty) => {
      const next = newGame(
        nextTheme,
        nextDifficulty,
        sharedGame ? startingPlayer : "host"
      );
      setTheme(nextTheme);
      setDifficulty(nextDifficulty);
      update(next);
      setNewGameConfirmation(false);
      setPendingChange(null);
    },
    [difficulty, sharedGame, startingPlayer, theme, update]
  );

  const requestConfigurationChange = (next) => {
    if (shared.flipped.length || shared.matched.length) setPendingChange(next);
    else startNewGame(next.theme ?? theme, next.difficulty ?? difficulty);
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen?.();
    else await document.querySelector(".memory-game")?.requestFullscreen?.();
  };
  const createMemoryLiveSession = useCallback(
    async (state = shared) => {
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
            activityKind: "memory",
            state,
            token,
          });
          const credential = await getHostRoomCredential({
            sessionId: created.id,
            token,
          });
          setHostLiveSession({
            ...created,
            credential,
            participantUrl: participantUrlForActivity({
              activityKind: "memory",
              participantUrl: created.participantUrl,
              siteOrigin: window.location.origin,
            }),
            role: "host",
            sessionId: created.id,
          });
          setMessage("Live Memory is ready. Copy the participant link.");
        } catch {
          setMessage("Live Memory is unavailable. You can still play locally.");
        }
        return;
      }
      if (!import.meta.env.DEV) {
        setMessage("Remote Live Sessions are not configured.");
        return;
      }
      const created = createLiveSession({
        activityKind: "memory",
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        id: createId(),
      });
      setHostLiveSession({
        ...created,
        participantUrl: `${window.location.origin}/join/${encodeURIComponent(created.id)}#activity=memory`,
        role: "host",
        sessionId: created.id,
      });
    },
    [createId, shared]
  );

  const startSharedGame = () => {
    const next = newGame(theme, difficulty, startingPlayer);
    setShared(next);
    setInviteConfirmation(false);
    void createMemoryLiveSession(next);
  };
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
    void createMemoryLiveSession();
  }, [createMemoryLiveSession, participantMode]);
  async function endSession() {
    if (hostLiveSession?.credential) {
      try {
        await endRemoteLiveSession({
          sessionId: hostLiveSession.sessionId,
          token: getCognitoHostToken(),
        });
      } catch {
        /* browser session still closes */
      }
    }
    live.endSession();
    setHostLiveSession(null);
    setMessage("Live Memory ended.");
  }
  const complete = completeMemoryGame(shared);
  if (participantMode && live.status === "ended")
    return (
      <main className="live-session-status">
        <h1>Session ended</h1>
        <p>This Memory game has ended.</p>
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
      className="memory-page"
      description="Turn over cards, find every pair, and play together from two computers."
      title="Memory Match"
    >
      <section className={`memory-game${isFullscreen ? " memory-game--fullscreen" : ""}`}>
        <div className="memory-game__toolbar">
          <div className="memory-game__status">
            <strong>
              {gameThemes.find((item) => item.id === shared.theme)?.label ?? shared.theme}
            </strong>
            {sharedGame ? (
              <span>
                Therapist: {shared.scores.host} pairs · Child: {shared.scores.participant}{" "}
                pairs
              </span>
            ) : (
              <span>
                {shared.matched.length / 2} of {shared.cards.length / 2} pairs
              </span>
            )}
          </div>
          {sharedGame && !complete ? (
            <p className="memory-game__turn">
              {shared.activePlayer === localPlayer
                ? "Your turn"
                : participantMode
                  ? "Therapist’s turn"
                  : "Child’s turn"}
            </p>
          ) : null}
        </div>
        {!participantMode ? (
          <div className="memory-game__controls">
            <label>
              Theme
              <select
                onChange={(event) =>
                  requestConfigurationChange({ theme: event.target.value })
                }
                value={theme}
              >
                {gameThemes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Difficulty
              <select
                onChange={(event) =>
                  requestConfigurationChange({ difficulty: event.target.value })
                }
                value={difficulty}
              >
                {Object.entries(memoryDifficulties).map(([id, item]) => (
                  <option key={id} value={id}>
                    {item.label} · {item.pairs} pairs
                  </option>
                ))}
              </select>
            </label>
            <button
              className="studio-button studio-button--secondary"
              disabled={live.status === "ended"}
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
                    activityKind: "memory",
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
              onCreate={() => setInviteConfirmation(true)}
              onEnd={() => void endSession()}
              participantState={live.participantState}
              session={hostLiveSession}
            />
            <button
              className="studio-button studio-button--secondary"
              onClick={() => void toggleFullscreen()}
              type="button"
            >
              {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />} Full
              Screen
            </button>
          </div>
        ) : null}
        {participantMode ? (
          <button
            className="studio-button studio-button--secondary memory-game__fullscreen"
            onClick={() => void toggleFullscreen()}
            type="button"
          >
            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />} Full Screen
          </button>
        ) : null}
        <p className="memory-game__hint">Turn over two cards to find a matching pair.</p>
        <div
          aria-label="Memory cards"
          className={`memory-game__board memory-game__board--${shared.cards.length}`}
        >
          {shared.cards.map((card, index) => {
            const removed = shared.matched.includes(index);
            const faceUp = shared.flipped.includes(index);
            return (
              <div
                className={`memory-card-slot ${removed ? "memory-card-slot--empty" : ""}`}
                key={`${card.id}-${index}`}
              >
                {!removed ? (
                  <button
                    aria-label={faceUp ? "Matching picture" : "Turn over card"}
                    aria-pressed={faceUp}
                    className={`memory-card ${faceUp ? "memory-card--up" : ""} ${shared.feedback?.type === "match" && shared.feedback.cards.includes(index) ? "memory-card--match" : ""} ${shared.feedback?.type === "mismatch" && shared.feedback.cards.includes(index) ? "memory-card--mismatch" : ""}`}
                    disabled={
                      live.status === "ended" ||
                      (participantMode && roomPermission === "watch") ||
                      !canFlipMemoryCard(shared, {
                        index,
                        player: localPlayer,
                        shared: sharedGame,
                      })
                    }
                    onClick={() => flip(index)}
                    type="button"
                  >
                    {faceUp ? (
                      <img alt="" className="memory-card__art" src={card.image} />
                    ) : (
                      <span aria-hidden="true">?</span>
                    )}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
        {complete ? (
          <section className="memory-game__complete">
            <Sparkles aria-hidden="true" size={24} />
            <div>
              <strong>
                {sharedGame
                  ? shared.scores.host === shared.scores.participant
                    ? "A tie — beautiful teamwork!"
                    : shared.scores.host > shared.scores.participant
                      ? "Great game — Therapist found more pairs."
                      : "Great game — Child found more pairs."
                  : "You found every pair!"}
              </strong>
              <span>
                {sharedGame
                  ? `Therapist: ${shared.scores.host} · Child: ${shared.scores.participant}`
                  : `${shared.cards.length / 2} pairs found`}
              </span>
            </div>
            {!participantMode ? (
              <>
                <button
                  className="studio-button studio-button--primary"
                  onClick={() => setNewGameConfirmation(true)}
                  type="button"
                >
                  Play Again
                </button>
                <button
                  className="studio-button studio-button--secondary"
                  onClick={() => requestConfigurationChange({ theme })}
                  type="button"
                >
                  Choose Theme
                </button>
              </>
            ) : null}
          </section>
        ) : null}
        {newGameConfirmation && !participantMode ? (
          <section className="memory-game__confirmation">
            <strong>Start a new game?</strong>
            {sharedGame ? (
              <label>
                Who starts?
                <select
                  onChange={(event) => setStartingPlayer(event.target.value)}
                  value={startingPlayer}
                >
                  <option value="host">Me</option>
                  <option value="participant">Child</option>
                </select>
              </label>
            ) : null}
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
                onClick={() => startNewGame()}
                type="button"
              >
                New Game
              </button>
            </div>
          </section>
        ) : null}
        {inviteConfirmation && !participantMode ? (
          <section className="memory-game__confirmation">
            <strong>Start a shared Memory game?</strong>
            <label>
              Who starts?
              <select
                onChange={(event) => setStartingPlayer(event.target.value)}
                value={startingPlayer}
              >
                <option value="host">Me</option>
                <option value="participant">Child</option>
              </select>
            </label>
            <div>
              <button
                className="studio-button studio-button--secondary"
                onClick={() => setInviteConfirmation(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="studio-button studio-button--primary"
                onClick={startSharedGame}
                type="button"
              >
                Create Invite
              </button>
            </div>
          </section>
        ) : null}
        {pendingChange && !participantMode ? (
          <section className="memory-game__confirmation">
            <strong>Replace the current game?</strong>
            <p>
              This starts a fresh board with the new{" "}
              {pendingChange.theme ? "theme" : "difficulty"}.
            </p>
            <div>
              <button
                className="studio-button studio-button--secondary"
                onClick={() => setPendingChange(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="studio-button studio-button--primary"
                onClick={() =>
                  startNewGame(
                    pendingChange.theme ?? theme,
                    pendingChange.difficulty ?? difficulty
                  )
                }
                type="button"
              >
                Replace Game
              </button>
            </div>
          </section>
        ) : null}
        {message ? <p role="status">{message}</p> : null}
      </section>
    </Page>
  );
}
