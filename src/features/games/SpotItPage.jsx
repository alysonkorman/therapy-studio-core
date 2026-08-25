import { nanoid } from "nanoid";
import { ArrowLeft, RotateCcw, Sparkles } from "lucide-react";
import * as IllustratedIcons from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Page } from "../../components/layout";
import { createLiveSession } from "../../models/liveSession";
import LiveSessionPanel from "../live-sessions/LiveSessionPanel";
import { useLiveSession } from "../live-sessions/useLiveSession";
import { createRemoteLiveSession, endRemoteLiveSession, getHostRoomCredential } from "../live-sessions/liveSessionApi";
import { createProductionWebSocketTransport } from "../live-sessions/productionWebSocketTransport";
import { captureCognitoHostToken, getCognitoHostToken, hasConfiguredLiveSessionBackend, liveSessionLoginUrl, rememberPendingLiveSessionInvite } from "../live-sessions/liveSessionHostAuth";
import { spotItLiveSessionAdapter } from "./spotItLiveSessionAdapter";
import "./GamesPage.css";

// 57 local symbols: a full Spot It deck needs 57 symbols and 57 cards.
const symbols = [
  ["fox", "Squirrel"], ["dog", "Dog"], ["cat", "Cat"], ["lion", "Rabbit"], ["frog", "Turtle"], ["owl", "Bird"], ["turtle", "Shell"], ["fish", "Fish"], ["butterfly", "Butterfly"], ["bee", "Bug"],
  ["lamp", "Lamp"], ["chair", "Armchair"], ["key", "KeyRound"], ["clock", "AlarmClock"], ["book", "BookOpen"], ["cup", "Coffee"], ["sock", "Shirt"], ["ball", "CircleDot"], ["gift", "Gift"], ["music", "Music2"],
  ["heart", "Heart"], ["star", "Star"], ["sparkle", "Sparkles"], ["rainbow", "Rainbow"], ["target", "Target"], ["crown", "Crown"], ["rocket", "Rocket"], ["balloon", "PartyPopper"], ["puzzle", "Puzzle"],
  ["sun", "Sun"], ["moon", "Moon"], ["cloud", "Cloud"], ["tree", "TreePine"], ["flower", "Flower2"], ["leaf", "Leaf"], ["fire", "Flame"], ["snow", "Snowflake"], ["wave", "Waves"], ["apple", "Apple"],
  ["circle", "Circle"], ["square", "Square"], ["triangle", "Triangle"], ["diamond", "Diamond"], ["hexagon", "Hexagon"], ["plus", "Plus"], ["cross", "X"], ["spiral", "Orbit"], ["bolt", "Zap"],
  ["car", "Car"], ["bike", "Bike"], ["boat", "Sailboat"], ["camera", "Camera"], ["guitar", "Guitar"], ["ice-cream", "IceCreamBowl"], ["pizza", "Pizza"], ["kite", "Paperclip"], ["unicorn", "WandSparkles"],
].map(([id, icon]) => ({ id, icon }));
const symbolById = Object.fromEntries(symbols.map((symbol) => [symbol.id, symbol]));
function fullDeck() {
  const cards = []; const point = (x, y) => `p${x}-${y}`; const infinity = (slope) => `i${slope}`;
  for (let slope = 0; slope < 7; slope += 1) for (let intercept = 0; intercept < 7; intercept += 1) cards.push([...Array.from({ length: 7 }, (_, x) => point(x, (slope * x + intercept) % 7)), infinity(slope)]);
  for (let x = 0; x < 7; x += 1) cards.push([...Array.from({ length: 7 }, (_, y) => point(x, y)), infinity("vertical")]);
  cards.push([...Array.from({ length: 7 }, (_, slope) => infinity(slope)), infinity("vertical")]);
  return cards.map((card) => card.map((pointId) => {
    if (pointId === "ivertical") return symbols[56].id;
    if (pointId.startsWith("i")) return symbols[49 + Number(pointId.slice(1))].id;
    const [, x, y] = pointId.match(/^p(\d)-(\d)$/);
    return symbols[Number(x) * 7 + Number(y)].id;
  }));
}
const deck = fullDeck();
function round() { const [left, right] = [...deck].sort(() => Math.random() - .5).slice(0, 2); const match = left.find((symbol) => right.includes(symbol)); return { version: 1, match, left: [...left].sort(() => Math.random() - .5), right: [...right].sort(() => Math.random() - .5), found: false }; }
function illustrationStyle(symbolId, cardIndex, index) { const hash = [...`${symbolId}-${cardIndex}-${index}`].reduce((total, letter) => total + letter.charCodeAt(0), 0); const symbolHash = [...symbolId].reduce((total, letter) => total + letter.charCodeAt(0), 0); const spots = cardIndex ? [[76, 21], [48, 18], [24, 28], [76, 46], [48, 47], [22, 59], [65, 77], [35, 80]] : [[20, 21], [50, 18], [78, 27], [24, 49], [55, 44], [77, 62], [35, 77], [63, 80]]; const [x, y] = spots[index]; return { "--spot-x": `${x}%`, "--spot-y": `${y}%`, "--spot-rotation": `${(hash % 70) - 35}deg`, "--spot-scale": 0.72 + (hash % 38) / 100, color: ["#e95f67", "#496ad6", "#ef9f31", "#399374", "#8d55bd"][symbolHash % 5] }; }

export default function SpotItPage({ createId = () => nanoid(), liveSession: suppliedLiveSession = null }) {
  const [shared, setShared] = useState(round);
  const [hostLiveSession, setHostLiveSession] = useState(null);
  const [message, setMessage] = useState("");
  // Fast Refresh preserves old round state, so discard the former icon-id round
  // rather than rendering its ids as text after the symbol-set upgrade.
  useEffect(() => {
    if (shared.left.some((symbol) => !symbolById[symbol]) || shared.right.some((symbol) => !symbolById[symbol])) setShared(round());
  }, [shared.left, shared.right]);
  const activeLiveSession = suppliedLiveSession ?? hostLiveSession;
  const participantMode = activeLiveSession?.role === "participant";
  const productionTransportFactory = useMemo(() => activeLiveSession?.credential ? (options) => createProductionWebSocketTransport({ ...options, credential: activeLiveSession.credential }) : undefined, [activeLiveSession?.credential]);
  const live = useLiveSession({ adapter: spotItLiveSessionAdapter, onRemoteState: setShared, role: activeLiveSession?.role, sessionId: activeLiveSession?.sessionId, sharedState: shared, transportFactory: productionTransportFactory });
  const cards = useMemo(() => [shared.left, shared.right], [shared]);
  const replace = (next) => { setShared(next); live.publishState(next); };
  const choose = (iconId) => {
    if (iconId !== shared.match || shared.found || live.status === "ended") return;
    const action = { type: "spot-it/found" };
    if (participantMode) live.requestAction(action);
    else replace(spotItLiveSessionAdapter.applyAction(shared, action));
  };
  const createSpotItLiveSession = useCallback(async () => {
    if (hasConfiguredLiveSessionBackend()) {
      const token = captureCognitoHostToken();
      if (!token) { const login = liveSessionLoginUrl(); if (login) { rememberPendingLiveSessionInvite(); window.location.assign(login); } else setMessage("Sign in to use Live Sessions."); return; }
      try { const created = await createRemoteLiveSession({ activityKind: "spot-it", state: shared, token }); const credential = await getHostRoomCredential({ sessionId: created.id, token }); setHostLiveSession({ ...created, credential, participantUrl: new URL(created.participantUrl, window.location.origin).toString(), role: "host", sessionId: created.id }); setMessage("Live Spot It is ready. Copy the participant link."); }
      catch { setMessage("Live Spot It is unavailable. You can continue playing locally."); }
      return;
    }
    if (!import.meta.env.DEV) { setMessage("Remote Live Sessions are not configured."); return; }
    const created = createLiveSession({ activityKind: "spot-it", expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), id: createId() });
    setHostLiveSession({ ...created, participantUrl: `${window.location.origin}/join/${encodeURIComponent(created.id)}#activity=spot-it`, role: "host", sessionId: created.id });
    setMessage("Local Live Spot It is ready for a second tab.");
  }, [createId, shared]);
  async function endSession() { if (hostLiveSession?.credential) { try { await endRemoteLiveSession({ sessionId: hostLiveSession.sessionId, token: getCognitoHostToken() }); } catch { /* client session still closes */ } } live.endSession(); setHostLiveSession(null); setMessage("Live Spot It ended."); }
  if (participantMode && live.status === "ended") return <main className="live-session-status"><h1>Session ended</h1><p>This Spot It session has ended.</p></main>;
  return <Page actions={<Link className="studio-button studio-button--secondary" to="/games"><ArrowLeft size={17} /> Back to Games</Link>} className="spot-it-page" description="Find the one symbol both cards share." title="Spot It"><section className="spot-it">
    {!participantMode ? <LiveSessionPanel onCopy={async () => { try { await navigator.clipboard?.writeText(hostLiveSession.participantUrl); setMessage("Participant link copied."); } catch { setMessage("Copy the participant link shown above."); } }} onCreate={() => void createSpotItLiveSession()} onEnd={() => void endSession()} participantState={live.participantState} session={hostLiveSession} /> : null}
    <p className="spot-it__instruction">Find the one matching picture on both cards.</p><div className="spot-it__cards">{cards.map((card, cardIndex) => <div aria-label={`Spot It card ${cardIndex + 1}`} className="spot-it__card" key={cardIndex}>{card.map((symbolId, index) => { const Symbol = IllustratedIcons[symbolById[symbolId]?.icon] ?? IllustratedIcons.Circle; return <button aria-label={`Choose ${symbolById[symbolId]?.id ?? "symbol"}`} className="spot-it__symbol" disabled={live.status === "ended"} key={symbolId} onClick={() => choose(symbolId)} style={illustrationStyle(symbolId, cardIndex, index)} type="button"><span aria-hidden="true"><Symbol strokeWidth={2.4} /></span></button>; })}</div>)}</div>
    {shared.found ? <p className="spot-it__found" role="status"><Sparkles size={20} /> You found the match!</p> : null}{message ? <p role="status">{message}</p> : null}
    {!participantMode ? <button className="studio-button studio-button--primary" onClick={() => replace(round())} type="button"><RotateCcw size={17} /> New Cards</button> : null}
  </section></Page>;
}
