import { Copy, Link2, X } from "lucide-react";

export default function LiveSessionPanel({
  onCreate,
  onEnd,
  onEnterSessionView,
  onCopy,
  participantState,
  session,
}) {
  if (!session)
    return (
      <button className="whiteboard-live-session-button" onClick={onCreate} type="button">
        <Link2 aria-hidden="true" size={17} /> Invite Child
      </button>
    );

  const connected = participantState === "connected";
  return (
    <section aria-label="Live Session" className="whiteboard-live-session-panel">
      <div>
        <strong>Live Session</strong>
        <span>{connected ? "Child connected" : "Waiting for child"}</span>
      </div>
      <code>{session.participantUrl}</code>
      <button onClick={onCopy} type="button">
        <Copy aria-hidden="true" size={16} /> Copy Link
      </button>
      <button onClick={onEnterSessionView} type="button">
        Enter Session View
      </button>
      <button
        className="whiteboard-live-session-panel__end"
        onClick={onEnd}
        type="button"
      >
        <X aria-hidden="true" size={16} /> End
      </button>
      <p>Non-PHI development only — use fake content while testing.</p>
    </section>
  );
}
