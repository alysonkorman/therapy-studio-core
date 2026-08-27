import { Copy, Link2, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSharedSession } from "./SharedSessionProvider";

export default function SharedSessionBar() {
  const shared = useSharedSession();
  const [message, setMessage] = useState("");
  const messageTimeoutRef = useRef(null);

  useEffect(
    () => () => {
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    },
    [],
  );

  const showTemporaryMessage = (nextMessage) => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    setMessage(nextMessage);
    messageTimeoutRef.current = setTimeout(() => {
      setMessage("");
      messageTimeoutRef.current = null;
    }, 2000);
  };

  const copyParticipantLink = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(shared.session.participantUrl);
      showTemporaryMessage("Link copied");
    } catch {
      showTemporaryMessage("Couldn’t copy link. Please try again.");
    }
  };

  if (!shared) return null;
  if (!shared.session)
    return (
      <button
        className="shared-session-bar shared-session-bar--start"
        onClick={() =>
          void shared.start().catch((startError) => setMessage(startError.message))
        }
        type="button"
      >
        <Link2 size={16} /> Start Live Session {message || shared.error}
      </button>
    );
  return (
    <section className="shared-session-bar" aria-label="Live Session">
      <span>
        ●{" "}
        {shared.participantState === "connected"
          ? "Child connected"
          : shared.status === "reconnecting"
            ? "Reconnecting…"
            : "Waiting for child"}
      </span>
      <span>Current: {shared.room.activityKind ?? "Waiting Room"}</span>
      <label>
        <span className="sr-only">Child permission</span>
        <select
          aria-label="Child permission"
          onChange={(event) =>
            shared.update({ type: "room/permission", permission: event.target.value })
          }
          value={shared.room.permission}
        >
          <option value="watch">Watch</option>
          <option value="participate">Participate</option>
          <option value="create">Create</option>
        </select>
      </label>
      <button onClick={() => shared.update({ type: "room/wait" })} type="button">
        <Send size={15} /> Waiting Room
      </button>
      <button
        onClick={() => void copyParticipantLink()}
        type="button"
      >
        <Copy size={15} /> Copy link
      </button>
      {message && (
        <span className="shared-session-bar__message" role="status">
          {message}
        </span>
      )}
      <button
        className="shared-session-bar__end"
        onClick={() => void shared.end()}
        type="button"
      >
        <X size={15} /> End Session
      </button>
    </section>
  );
}
