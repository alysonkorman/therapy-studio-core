import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { promptSpinnerLiveSessionAdapter } from "./promptSpinnerLiveSessionAdapter";
import townBoard from "../../assets/game-backgrounds/prompt-path-town.jpg";
import spaceBoard from "../../assets/game-backgrounds/prompt-path-space.jpg";
import farmBoard from "../../assets/game-backgrounds/prompt-path-farm.jpg";
import tropicalBoard from "../../assets/game-backgrounds/prompt-path-tropical.jpg";

const boardImages = { town: townBoard, space: spaceBoard, farm: farmBoard, tropical: tropicalBoard };
export default function SpinnerSession({ initialState, onRestart }) {
  const [state, setState] = useState(initialState);
  const spin = () => { const action = { type: "spinner/spin", steps: Math.floor(Math.random() * 6) + 1, promptIndex: Math.floor(Math.random() * state.prompts.length) }; setState(promptSpinnerLiveSessionAdapter.applyAction(state, action)); };
  const prompt = state.currentPrompt;
  return <section className="prompt-spinner-session" aria-label="Prompt Path game"><div className="prompt-spinner-board"><img alt={`${state.theme} Prompt Path board`} src={boardImages[state.theme]} /></div><div className="prompt-spinner-controls"><div><strong>{state.lastSpin ?? "?"}</strong><span>spaces</span><small>Move your token to space {state.position + 1} on the board.</small></div><button className="studio-button studio-button--primary" onClick={spin} type="button">Spin</button></div><article className="prompt-spinner-card" aria-live="polite">{prompt ? <><small>{prompt.deckTitle}</small><p>{prompt.text}</p></> : <p>Spin to reveal your first prompt.</p>}</article><div><button className="studio-button studio-button--secondary" onClick={onRestart} type="button"><RotateCcw size={17} /> Choose decks</button></div></section>;
}
