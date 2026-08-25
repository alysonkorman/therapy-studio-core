import { nanoid } from "nanoid";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { EmptyState, Page, Section } from "../../components/layout";
import { bingoRepository } from "../../lib/data";
import IconBrowserField from "../icons/IconBrowserField";
import "./GamesPage.css";

export default function BingoEditorPage({ gameId: suppliedId, repository = bingoRepository }) {
  const { gameId: routeId } = useParams();
  const gameId = suppliedId ?? routeId;
  const [game, setGame] = useState(null);
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    repository.getBingoSetById(gameId).then((value) => {
      if (!active) return;
      setGame(value);
      setDraft(value);
      setStatus("ready");
    }).catch(() => active && setStatus("missing"));
    return () => { active = false; };
  }, [gameId, repository]);

  if (status === "loading") return <Page title="Manage Bingo"><p role="status">Loading Bingo Set…</p></Page>;
  if (status === "missing" || !game) return <Page title="Bingo Set Not Found"><EmptyState action={<Link className="studio-button studio-button--primary" to="/games">Back to Games</Link>} title="We Couldn’t Find That Bingo Set" /></Page>;
  if (game.starter) return <Page title="Starter Bingo Is Protected"><EmptyState action={<Link className="studio-button studio-button--primary" to="/games">Duplicate to Edit in Games</Link>} title="Duplicate This Starter First" /></Page>;

  const change = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  async function save(next = draft) {
    setError("");
    try {
      const normalized = { ...next, items: next.items.map((item, sortOrder) => ({ ...item, sortOrder })) };
      const saved = await repository.updateBingoSet(game.id, normalized);
      setGame(saved);
      setDraft(saved);
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  return (
    <Page actions={<Link className="studio-button studio-button--secondary" to="/games"><ArrowLeft aria-hidden="true" size={17} /> Back to Games</Link>} className="trivia-editor" description="Edit the board and its words or visual labels." title={`Manage ${game.title}`}>
      <Section title="Set Details">
        <form className="trivia-metadata-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <label>Title<input required value={draft.title} onChange={(event) => change("title", event.target.value)} /></label>
          <label>Description<textarea value={draft.description} onChange={(event) => change("description", event.target.value)} /></label>
          <div className="trivia-form-grid">
            <label>Category<input value={draft.category} onChange={(event) => change("category", event.target.value)} /></label>
            <label>Board Size<select value={draft.boardSize} onChange={(event) => change("boardSize", Number(event.target.value))}><option value={3}>3×3</option><option value={4}>4×4</option><option value={5}>5×5</option></select></label>
          </div>
          <label className="trivia-checkbox"><input checked={draft.useFreeSpace} onChange={(event) => change("useFreeSpace", event.target.checked)} type="checkbox" />Include a free space</label>
          {error ? <p role="alert">{error}</p> : null}
          <button className="studio-button studio-button--primary" type="submit">Save Bingo Set</button>
        </form>
      </Section>
      <Section actions={<button className="studio-button studio-button--primary" onClick={() => change("items", [...draft.items, { id: nanoid(), text: "New item", sortOrder: draft.items.length }])} type="button"><Plus aria-hidden="true" size={17} /> Add Item</button>} description={`${draft.items.length} items`} title="Bingo Items">
        <ol className="trivia-question-list">
          {draft.items.map((item, index) => <li key={item.id}><article><label>Item {index + 1}<input value={item.text} onChange={(event) => change("items", draft.items.map((current) => current.id === item.id ? { ...current, text: event.target.value } : current))} /></label><IconBrowserField actionLabel={item.iconId ? "Change Visual" : "Add Visual"} label={`Item ${index + 1} visual`} onSave={(iconId) => change("items", draft.items.map((current) => current.id === item.id ? { ...current, iconId } : current))} value={item.iconId ?? null} />{item.iconId ? <button onClick={() => change("items", draft.items.map((current) => current.id === item.id ? { ...current, iconId: null } : current))} type="button">Clear Visual</button> : null}<button aria-label={`Delete item ${index + 1}`} disabled={draft.items.length === 1} onClick={() => change("items", draft.items.filter(({ id }) => id !== item.id))} type="button"><Trash2 aria-hidden="true" size={15} /> Delete</button></article></li>)}
        </ol>
        <button className="studio-button studio-button--primary" onClick={() => void save()} type="button">Save Items</button>
      </Section>
    </Page>
  );
}
