import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { joinRemoteLiveSession } from "./liveSessionApi";
import { getLiveActivity } from "./liveActivityRegistry";
import { hasConfiguredLiveSessionBackend } from "./liveSessionHostAuth";
import { participantRoomCredentialSchema } from "./liveSessionProtocol";
import SharedSessionParticipantShell from "./SharedSessionParticipantShell";
import "./LiveSessions.css";

function participantCredentialKey(sessionId) {
  return `therapy-studio:live-session-participant:${sessionId}`;
}

function readParticipantCredential(sessionId) {
  if (!sessionId) return null;
  try {
    const parsed = participantRoomCredentialSchema.safeParse(
      JSON.parse(sessionStorage.getItem(participantCredentialKey(sessionId)) || "null")
    );
    if (
      !parsed.success ||
      parsed.data.sessionId !== sessionId ||
      new Date(parsed.data.expiresAt).getTime() <= Date.now()
    )
      return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export default function LiveSessionParticipantPage() {
  const { sessionId } = useParams();
  const backendConfigured = hasConfiguredLiveSessionBackend();
  const localHarness =
    import.meta.env.VITEST ||
    import.meta.env.MODE === "test" ||
    (import.meta.env.DEV && !backendConfigured);
  const inviteFragment = new URLSearchParams(window.location.hash.slice(1));
  const capability = inviteFragment.get("p");
  const invitedActivityKind = inviteFragment.get("activity");
  const localActivityKind = invitedActivityKind;
  const [credential, setCredential] = useState(() =>
    readParticipantCredential(sessionId)
  );
  const [state, setState] = useState(() =>
    localHarness
      ? "local"
      : backendConfigured
        ? credential || capability
          ? "connecting"
          : "invalid"
        : "unavailable"
  );
  const activity = getLiveActivity(
    credential?.activityKind ??
      (state === "local" ? (localActivityKind ?? "whiteboard") : null)
  );
  const ParticipantView = activity?.ParticipantView;

  useEffect(() => {
    if (!sessionId) return;
    if (!backendConfigured || credential) return;
    if (!capability) return;
    joinRemoteLiveSession({ capability, invitedActivityKind, sessionId })
      .then((next) => {
        window.history.replaceState(null, "", `/join/${sessionId}`);
        sessionStorage.setItem(participantCredentialKey(sessionId), JSON.stringify(next));
        setCredential(next);
        setState("ready");
      })
      .catch(() => setState("invalid"));
  }, [backendConfigured, capability, credential, invitedActivityKind, sessionId]);

  if (!sessionId) {
    return <p className="live-session-status">This Live Session link is invalid.</p>;
  }
  if (state === "invalid" || state === "unavailable")
    return <p className="live-session-status">This session is no longer available.</p>;

  return (
    <main className="live-session-participant-page">
      {credential || state === "local" ? (
        credential?.activityKind === "shared-room" ||
        localActivityKind === "shared-room" ? (
          <SharedSessionParticipantShell credential={credential} sessionId={sessionId} />
        ) : ParticipantView ? (
          <ParticipantView liveSession={{ credential, role: "participant", sessionId }} />
        ) : (
          <p className="live-session-status">This activity is unavailable.</p>
        )
      ) : (
        <p className="live-session-status">Connecting to session…</p>
      )}
    </main>
  );
}
