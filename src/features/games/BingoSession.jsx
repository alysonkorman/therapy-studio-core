import { nanoid } from "nanoid";
import { RotateCcw, Shuffle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createBingoBoard, hasBingo } from "../../engines/games/bingoBoard";
import { createLiveSession } from "../../models/liveSession";
import { IconRenderer } from "../icons";
import LiveSessionPanel from "../live-sessions/LiveSessionPanel";
import { useLiveSession } from "../live-sessions/useLiveSession";
import { createRemoteLiveSession, endRemoteLiveSession, getHostRoomCredential } from "../live-sessions/liveSessionApi";
import { createProductionWebSocketTransport } from "../live-sessions/productionWebSocketTransport";
import { captureCognitoHostToken, consumePendingLiveSessionInvite, getCognitoHostToken, hasConfiguredLiveSessionBackend, liveSessionLoginUrl, rememberPendingLiveSessionInvite } from "../live-sessions/liveSessionHostAuth";
import { bingoLiveSessionAdapter } from "./bingoLiveSessionAdapter";
import "./GamesPage.css";

function initialState(game, random) {
  if (!game) return { version: 1, title: "Bingo", board: null, marked: [] };
  const board = createBingoBoard(game, { random });
  return {
    version: 1,
    title: game.title,
    board,
    marked: board.cells.filter(({ free }) => free).map(({ id }) => id),
  };
}

export default function BingoSession({ createId = () => nanoid(), game, liveSession: suppliedLiveSession = null, onMeaningfulUse, random = Math.random }) {
  const [initial] = useState(() => {
    try { return { shared: initialState(game, random), error: "" }; }
    catch (caughtError) { return { shared: { version: 1, title: game?.title ?? "Bingo", board: null, marked: [] }, error: caughtError.message }; }
  });
  const [shared, setShared] = useState(initial.shared);
  const [error, setError] = useState(initial.error);
  const [message, setMessage] = useState("");
  const [hostLiveSession, setHostLiveSession] = useState(null);
  const pendingInviteHandled = useRef(false);
  const createLiveSessionRef = useRef(null);
  const activeLiveSession = suppliedLiveSession ?? hostLiveSession;
  const participantMode = activeLiveSession?.role === "participant";
  const productionTransportFactory = useMemo(() => {
    const credential = activeLiveSession?.credential;
    if (!credential) return undefined;
    return (options) => createProductionWebSocketTransport({ ...options, credential });
  }, [activeLiveSession?.credential]);
  const onRemoteState = useCallback((next) => setShared(next), []);
  const live = useLiveSession({
    adapter: bingoLiveSessionAdapter,
    onRemoteState,
    role: activeLiveSession?.role,
    sessionId: activeLiveSession?.sessionId,
    sharedState: shared,
    transportFactory: productionTransportFactory,
  });
  const marked = useMemo(() => new Set(shared.marked), [shared.marked]);
  const won = useMemo(() => shared.board ? hasBingo(shared.board, marked) : false, [marked, shared.board]);

  function replace(next) { setShared(next); live.publishState(next); }
  function toggle(cell) {
    if (cell.free || live.status === "ended") return;
    const action = { type: "bingo/toggle", cellId: cell.id };
    if (participantMode) { live.requestAction(action); return; }
    replace(bingoLiveSessionAdapter.applyAction(shared, action));
    onMeaningfulUse?.();
  }
  function clearBoard() {
    if (!shared.board) return;
    replace({ ...shared, marked: shared.board.cells.filter(({ free }) => free).map(({ id }) => id) });
  }
  function newBoard() {
    if (!game) return;
    try { replace(initialState(game, random)); setError(""); }
    catch (caughtError) { setError(caughtError.message); }
  }

  const createBingoLiveSession = useCallback(async () => {
    if (hasConfiguredLiveSessionBackend()) {
      const token = captureCognitoHostToken();
      if (!token) {
        const login = liveSessionLoginUrl();
        if (login) { rememberPendingLiveSessionInvite(); window.location.assign(login); }
        else setMessage("Sign in to use Live Sessions.");
        return;
      }
      try {
        const created = await createRemoteLiveSession({ activityKind: "bingo", state: shared, token });
        const credential = await getHostRoomCredential({ sessionId: created.id, token });
        setHostLiveSession({ ...created, credential, participantUrl: new URL(created.participantUrl, window.location.origin).toString(), role: "host", sessionId: created.id });
        setMessage("Live Bingo is ready. Copy the participant link.");
      } catch { setMessage("Live Bingo is unavailable. You can continue playing locally."); }
      return;
    }
    if (!import.meta.env.DEV) { setMessage("Remote Live Sessions are not configured."); return; }
    const created = createLiveSession({ activityKind: "bingo", expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), id: createId() });
    setHostLiveSession({ ...created, participantUrl: `${window.location.origin}/join/${encodeURIComponent(created.id)}#activity=bingo`, role: "host", sessionId: created.id });
    setMessage("Local Live Bingo is ready for a second tab.");
  }, [createId, shared]);

  useEffect(() => { createLiveSessionRef.current = createBingoLiveSession; }, [createBingoLiveSession]);
  useEffect(() => {
    if (participantMode || pendingInviteHandled.current || !hasConfiguredLiveSessionBackend() || !captureCognitoHostToken() || !consumePendingLiveSessionInvite()) return;
    pendingInviteHandled.current = true;
    void createLiveSessionRef.current?.();
  }, [participantMode]);

  async function endSession() {
    if (hostLiveSession?.credential) {
      try { await endRemoteLiveSession({ sessionId: hostLiveSession.sessionId, token: getCognitoHostToken() }); }
      catch { /* local end still closes the client session */ }
    }
    live.endSession();
    setHostLiveSession(null);
    setMessage("Live Bingo ended.");
  }

  if (participantMode && live.status === "ended") return <main className="live-session-status"><h1>Session ended</h1><p>This Bingo session has ended.</p></main>;
  const board = shared.board;
  return (
    <section className="bingo-session" aria-label="Bingo board">
      {!participantMode ? <LiveSessionPanel onCopy={async () => { try { await navigator.clipboard?.writeText(hostLiveSession.participantUrl); setMessage("Participant link copied."); } catch { setMessage("Copy the participant link shown above."); } }} onCreate={() => void createBingoLiveSession()} onEnd={() => void endSession()} participantState={live.participantState} session={hostLiveSession} /> : null}
      {participantMode ? <h1>{shared.title}</h1> : null}
      <div className="bingo-session__toolbar">
        <p>{board ? `${board.size}×${board.size} board${board.hasFreeSpace ? " · Center Free Space" : ""}` : "Connecting to Bingo…"}</p>
        {!participantMode ? <div><button className="studio-button studio-button--secondary" onClick={clearBoard} type="button"><RotateCcw aria-hidden="true" size={17} /> Clear Board</button><button className="studio-button studio-button--secondary" onClick={newBoard} type="button"><Shuffle aria-hidden="true" size={17} /> New Board</button></div> : null}
      </div>
      {message ? <p role="status">{message}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {won ? <p className="bingo-session__win" role="status">BINGO!</p> : null}
      {board ? <div className={`bingo-board bingo-board--${board.size}`}>{board.cells.map((cell) => { const isMarked = marked.has(cell.id); return <button aria-label={cell.free ? "Free Space" : `${isMarked ? "Unmark" : "Mark"} ${cell.text}`} aria-pressed={isMarked} className="bingo-square" data-free={cell.free || undefined} disabled={cell.free || live.status === "ended"} key={cell.id} onClick={() => toggle(cell)} type="button">{cell.iconId ? <IconRenderer iconId={cell.iconId} size={34} /> : null}<span>{cell.text}</span></button>; })}</div> : null}
    </section>
  );
}
