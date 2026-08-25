import WhiteboardPage from "../whiteboard/WhiteboardPage";
import { whiteboardLiveSessionAdapter } from "../whiteboard/whiteboardLiveSessionAdapter";
import BingoSession from "../games/BingoSession";
import { bingoLiveSessionAdapter } from "../games/bingoLiveSessionAdapter";
import SpinnerSession from "../games/SpinnerSession";
import { promptSpinnerLiveSessionAdapter } from "../games/promptSpinnerLiveSessionAdapter";
import VisualGameCanvasPage from "../games/VisualGameCanvasPage";
import { visualGameLiveSessionAdapter } from "../games/visualGameLiveSessionAdapter";
import SpotItPage from "../games/SpotItPage";
import { spotItLiveSessionAdapter } from "../games/spotItLiveSessionAdapter";

// A participant never chooses the activity. This registry resolves only the
// activity kind returned by the room authority after capability exchange.
const activities = Object.freeze({
  whiteboard: Object.freeze({
    adapter: whiteboardLiveSessionAdapter,
    activityKind: "whiteboard",
    ParticipantView: WhiteboardPage,
    participantLabel: "Whiteboard",
  }),
  bingo: Object.freeze({
    adapter: bingoLiveSessionAdapter,
    activityKind: "bingo",
    ParticipantView: BingoSession,
    participantLabel: "Bingo",
  }),
  "prompt-spinner": Object.freeze({
    adapter: promptSpinnerLiveSessionAdapter,
    activityKind: "prompt-spinner",
    ParticipantView: SpinnerSession,
    participantLabel: "Prompt Path",
  }),
  "visual-game": Object.freeze({ adapter: visualGameLiveSessionAdapter, activityKind: "visual-game", ParticipantView: VisualGameCanvasPage, participantLabel: "Visual Game" }),
  "spot-it": Object.freeze({ adapter: spotItLiveSessionAdapter, activityKind: "spot-it", ParticipantView: SpotItPage, participantLabel: "Spot It" }),
});

export function getLiveActivity(activityKind) {
  return activities[activityKind] ?? null;
}

export function getSupportedLiveActivityKinds() {
  return Object.keys(activities);
}
