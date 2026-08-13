import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import WhiteboardPage from "../whiteboard/WhiteboardPage";
import { joinRemoteLiveSession } from "./liveSessionApi";
import { hasConfiguredLiveSessionBackend } from "./liveSessionHostAuth";
import "./LiveSessions.css";

export default function LiveSessionParticipantPage() {
  const { sessionId } = useParams();
  const localHarness = import.meta.env.DEV || import.meta.env.MODE === "test";
  const capability = new URLSearchParams(window.location.hash.slice(1)).get("p");
  const [credential, setCredential] = useState(null);
  const [state, setState] = useState(() =>
    hasConfiguredLiveSessionBackend()
      ? capability
        ? "connecting"
        : "invalid"
      : localHarness
        ? "local"
        : "unavailable"
  );

  useEffect(() => {
    if (!sessionId) return;
    if (!hasConfiguredLiveSessionBackend()) return;
    if (!capability) return;
    joinRemoteLiveSession({ capability, sessionId })
      .then((next) => {
        window.history.replaceState(null, "", `/join/${sessionId}`);
        setCredential(next);
        setState("ready");
      })
      .catch(() => setState("invalid"));
  }, [capability, sessionId]);

  if (!sessionId) {
    return <p className="live-session-status">This Live Session link is invalid.</p>;
  }
  if (state === "invalid" || state === "unavailable")
    return <p className="live-session-status">This session is no longer available.</p>;

  return (
    <main className="live-session-participant-page">
      <header className="live-session-participant-brand">
        <strong>Therapy Studio</strong>
        <span>Live Activity</span>
      </header>
      {credential || state === "local" ? (
        <WhiteboardPage liveSession={{ credential, role: "participant", sessionId }} />
      ) : (
        <p className="live-session-status">Connecting to session…</p>
      )}
    </main>
  );
}
