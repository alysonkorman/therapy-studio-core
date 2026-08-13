import { useState } from "react";

import { worksheetStarterLayouts } from "../../engines/worksheets/worksheetStarterLayouts";

export default function NewWorksheetDialog({ onCancel, onCreate }) {
  const [title, setTitle] = useState("");
  const [starterId, setStarterId] = useState("blank");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onCreate({ title, starterId });
    } catch (caughtError) {
      setError(caughtError.message);
      setSaving(false);
    }
  }

  return (
    <section className="worksheet-dialog" aria-labelledby="new-worksheet-title">
      <h2 id="new-worksheet-title">New Worksheet</h2>
      <form onSubmit={submit}>
        <label>
          Worksheet Title
          <input
            autoFocus
            onChange={(event) => setTitle(event.target.value)}
            required
            value={title}
          />
        </label>
        <label>
          Start With…
          <select
            onChange={(event) => setStarterId(event.target.value)}
            value={starterId}
          >
            {worksheetStarterLayouts.map((starter) => (
              <option key={starter.id} value={starter.id}>
                {starter.label}
              </option>
            ))}
          </select>
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <div className="worksheet-actions">
          <button disabled={saving} type="submit">
            {saving ? "Creating…" : "Create Worksheet"}
          </button>
          <button disabled={saving} onClick={onCancel} type="button">
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
