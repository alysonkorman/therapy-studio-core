import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { promptSpinnerLiveSessionAdapter } from "./promptSpinnerLiveSessionAdapter";
import townBoard from "../../assets/game-backgrounds/prompt-path-town.jpg";
import spaceBoard from "../../assets/game-backgrounds/prompt-path-space.jpg";
import farmBoard from "../../assets/game-backgrounds/prompt-path-farm.jpg";
import tropicalBoard from "../../assets/game-backgrounds/prompt-path-tropical.jpg";

const spaces = Array.from({ length: 24 }, (_, index) => index);
const boardImages = { town: townBoard, space: spaceBoard, farm: farmBoard, tropical: tropicalBoard };
export default function SpinnerSession({ initialState, onRestart }) {
  const [state, setState] = useState(initialState);
  const spin = () => { const action = { type: "spinner/spin", steps: Math.floor(Math.random() * 6) + 1, promptIndex: Math.floor(Math.random() * state.prompts.length) }; setState(promptSpinnerLiveSessionAdapter.applyAction(state, action)); };
  const prompt = state.currentPrompt;
  return <section className="prompt-spinner-session" aria-label="Prompt Path game"><div className="prompt-spinner-board" style={{ backgroundImage: `linear-gradient(rgb(31 22 54 / 20%), rgb(31 22 54 / 20%)), url(${boardImages[state.theme]})` }}>{spaces.map((space) => <span aria-label={space === state.position ? "Player token" : undefined} className={`prompt-spinner-space ${space === state.position ? "prompt-spinner-space--current" : ""}`} key={space}>{space + 1}{space === state.position ? <b>●</b> : null}</span>)}<div className="prompt-spinner-center"><strong>{state.lastSpin ?? "?"}</strong><span>spaces</span><button className="studio-button studio-button--primary" onClick={spin} type="button">Spin</button></div></div><article className="prompt-spinner-card" aria-live="polite">{prompt ? <><small>{prompt.deckTitle}</small><p>{prompt.text}</p></> : <p>Spin to reveal your first prompt.</p>}</article><div><button className="studio-button studio-button--secondary" onClick={onRestart} type="button"><RotateCcw size={17} /> Choose decks</button></div></section>;
}
