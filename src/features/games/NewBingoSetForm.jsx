import { useState } from "react";

export default function NewBingoSetForm({ onCancel, onCreate }) {
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    category: "",
    boardSize: 3,
    useFreeSpace: true,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const change = (field, value) =>
    setDraft((current) => ({ ...current, [field]: value }));

  return (
    <section className="trivia-authoring-panel" aria-labelledby="new-bingo-title">
      <h2 id="new-bingo-title">New Bingo Set</h2>
      <form
        className="trivia-metadata-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          setError("");
          try {
            await onCreate(draft);
          } catch (caughtError) {
            setError(caughtError.message);
            setSaving(false);
          }
        }}
      >
        <label>
          Title
          <input autoFocus required value={draft.title} onChange={(event) => change("title", event.target.value)} />
        </label>
        <label>
          Description
          <textarea value={draft.description} onChange={(event) => change("description", event.target.value)} />
        </label>
        <div className="trivia-form-grid">
          <label>
            Category
            <input value={draft.category} onChange={(event) => change("category", event.target.value)} />
          </label>
          <label>
            Board Size
            <select value={draft.boardSize} onChange={(event) => change("boardSize", Number(event.target.value))}>
              <option value={3}>3×3</option>
              <option value={4}>4×4</option>
              <option value={5}>5×5</option>
            </select>
          </label>
        </div>
        <label className="trivia-checkbox">
          <input checked={draft.useFreeSpace} onChange={(event) => change("useFreeSpace", event.target.checked)} type="checkbox" />
          Include a free space
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <div className="trivia-authoring-actions">
          <button className="studio-button studio-button--primary" disabled={saving} type="submit">
            {saving ? "Creating…" : "Create Bingo Set"}
          </button>
          <button className="studio-button studio-button--secondary" disabled={saving} onClick={onCancel} type="button">Cancel</button>
        </div>
      </form>
    </section>
  );
}
