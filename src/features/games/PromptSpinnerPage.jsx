import { ArrowLeft, Play, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Page } from "../../components/layout";
import { promptDeckRepository } from "../../lib/data";
import SpinnerSession from "./SpinnerSession";
import "./GamesPage.css";

function makeState(decks, theme) {
  const prompts = decks.flatMap((deck) => deck.prompts.map((prompt) => ({ id: `${deck.id}:${prompt.id}`, text: prompt.text, deckTitle: deck.title }))).slice(0, 120);
  return { version: 1, title: "Prompt Path", theme, deckTitles: decks.map(({ title }) => title), prompts, position: 0, lastSpin: null, currentPrompt: null };
}

export default function PromptSpinnerPage({ repository = promptDeckRepository }) {
  const [decks, setDecks] = useState([]); const [selected, setSelected] = useState([]); const [state, setState] = useState(null); const [theme, setTheme] = useState("town");
  useEffect(() => { repository.getAllPromptDecks().then((items) => setDecks(items.filter((deck) => deck.prompts.length))).catch(() => setDecks([])); }, [repository]);
  const selectedDecks = useMemo(() => decks.filter((deck) => selected.includes(deck.id)), [decks, selected]);
  if (state) return <Page actions={<Link className="studio-button studio-button--secondary" to="/games"><ArrowLeft size={17} /> Back to Games</Link>} className="prompt-spinner-page" description="Spin, move together, and explore a prompt." title="Prompt Path"><SpinnerSession initialState={state} onRestart={() => setState(null)} /></Page>;
  return <Page actions={<Link className="studio-button studio-button--secondary" to="/games"><ArrowLeft size={17} /> Back to Games</Link>} className="prompt-spinner-page" description="Choose one or more prompt decks, then spin your way through a shared conversation." title="Prompt Path">
    <section className="prompt-spinner-setup"><Sparkles aria-hidden="true" size={30} /><div><h2>Choose prompt decks</h2><p>Up to 120 prompts are brought into this game, so it can be shared in a live session.</p></div>
      <div className="prompt-spinner-decks">{decks.map((deck) => <label key={deck.id}><input checked={selected.includes(deck.id)} onChange={() => setSelected((ids) => ids.includes(deck.id) ? ids.filter((id) => id !== deck.id) : [...ids, deck.id])} type="checkbox" /> <span>{deck.title}</span><small>{deck.prompts.length} prompts</small></label>)}</div>
      <fieldset className="prompt-spinner-themes"><legend>Choose a board</legend>{[["town", "Town trail"], ["space", "Space mission"], ["farm", "Farm adventure"], ["tropical", "Tropical adventure"]].map(([value, label]) => <label key={value}><input checked={theme === value} name="prompt-path-theme" onChange={() => setTheme(value)} type="radio" value={value} />{label}</label>)}</fieldset>
      {!decks.length ? <p role="status">Add prompts to a deck first, then come back to play.</p> : null}
      <button className="studio-button studio-button--primary" disabled={!selectedDecks.length} onClick={() => setState(makeState(selectedDecks, theme))} type="button"><Play size={17} /> Start Prompt Path</button>
    </section>
  </Page>;
}
