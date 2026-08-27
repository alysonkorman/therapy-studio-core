import { useCallback, useState } from "react";
import { useLiveSession } from "./useLiveSession";
import { initialSharedRoomState, sharedRoomAdapter } from "./sharedRoomAdapter";
import { createProductionWebSocketTransport } from "./productionWebSocketTransport";
import SpotItPage from "../games/SpotItPage";
import MemoryGamePage from "../games/MemoryGamePage";
import WhiteboardPage from "../whiteboard/WhiteboardPage";

export default function SharedSessionParticipantShell({ credential, sessionId }) {
  const [room, setRoom] = useState(initialSharedRoomState);
  const transportFactory = useCallback(
    (options) => createProductionWebSocketTransport({ ...options, credential }),
    [credential]
  );
  const live = useLiveSession({
    adapter: sharedRoomAdapter,
    onRemoteState: setRoom,
    role: "participant",
    sessionId,
    sharedState: room,
    transportFactory,
  });
  if (
    room.view === "activity" &&
    room.activityKind === "spot-it" &&
    room.activityStates["spot-it"]
  )
    return (
      <SpotItPage
        onSharedRoomAction={live.requestAction}
        sharedRole="participant"
        sharedRoom={room}
      />
    );
  if (
    room.view === "activity" &&
    room.activityKind === "whiteboard" &&
    room.activityStates.whiteboard
  )
    return (
      <WhiteboardPage
        onSharedRoomAction={live.requestAction}
        sharedRole="participant"
        sharedRoom={room}
      />
    );
  if (
    room.view === "activity" &&
    room.activityKind === "memory" &&
    room.activityStates.memory
  )
    return (
      <MemoryGamePage
        onSharedRoomAction={live.requestAction}
        sharedRole="participant"
        sharedRoom={room}
      />
    );
  const state = live.status === "connected" ? "connected" : "reconnecting";
  return (
    <section className="live-session-waiting" aria-live="polite">
      <span aria-hidden="true">✨</span>
      <h1>
        {room.view === "activity" ? `Starting ${room.activityKind}…` : "Hang tight!"}
      </h1>
      <p>
        {state === "reconnecting"
          ? "Reconnecting to your therapy room…"
          : room.view === "activity"
            ? "Your therapist is getting the activity ready."
            : "Your activity will start in a moment."}
      </p>
      <p className="live-session-waiting__small">
        Your therapist will choose the next activity.
      </p>
    </section>
  );
}
