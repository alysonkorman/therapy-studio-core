import { useParams } from "react-router-dom";

import WhiteboardPage from "../whiteboard/WhiteboardPage";
import "./LiveSessions.css";

export default function LiveSessionParticipantPage() {
  const { sessionId } = useParams();

  if (!sessionId) {
    return <p className="live-session-status">This Live Session link is invalid.</p>;
  }

  return (
    <main className="live-session-participant-page">
      <header className="live-session-participant-brand">
        <strong>Therapy Studio</strong>
        <span>Live Activity</span>
      </header>
      <WhiteboardPage liveSession={{ role: "participant", sessionId }} />
    </main>
  );
}
