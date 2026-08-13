import WhiteboardPage from "../whiteboard/WhiteboardPage";
import { whiteboardLiveSessionAdapter } from "../whiteboard/whiteboardLiveSessionAdapter";

// A participant never chooses the activity. This registry resolves only the
// activity kind returned by the room authority after capability exchange.
const activities = Object.freeze({
  whiteboard: Object.freeze({
    adapter: whiteboardLiveSessionAdapter,
    activityKind: "whiteboard",
    ParticipantView: WhiteboardPage,
    participantLabel: "Whiteboard",
  }),
});

export function getLiveActivity(activityKind) {
  return activities[activityKind] ?? null;
}

export function getSupportedLiveActivityKinds() {
  return Object.keys(activities);
}
