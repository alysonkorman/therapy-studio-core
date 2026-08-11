import { useState } from "react";

import IconBrowserField from "../icons/IconBrowserField";

const list = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export default function NewTriviaSetForm({ onCancel, onCreate }) {
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    category: "",
    difficulty: "mixed",
    iconId: null,
    color: "#6C46C3",
    pointsEnabled: false,
    tags: "",
    goals: "",
    diagnoses: "",
    ageRanges: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const change = (field, value) =>
    setDraft((current) => ({ ...current, [field]: value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onCreate({
        ...draft,
        tags: list(draft.tags),
        goals: list(draft.goals),
        diagnoses: list(draft.diagnoses),
        ageRanges: list(draft.ageRanges),
      });
    } catch (caughtError) {
      setError(caughtError.message);
      setSaving(false);
    }
  }

  return (
    <section className="trivia-authoring-panel" aria-labelledby="new-trivia-title">
      <h2 id="new-trivia-title">New Trivia Set</h2>
      <form className="trivia-metadata-form" onSubmit={submit}>
        <label>
          Title
          <input
            autoFocus
            required
            value={draft.title}
            onChange={(event) => change("title", event.target.value)}
          />
        </label>
        <label>
          Description
          <textarea
            value={draft.description}
            onChange={(event) => change("description", event.target.value)}
          />
        </label>
        <div className="trivia-form-grid">
          <label>
            Category
            <input
              value={draft.category}
              onChange={(event) => change("category", event.target.value)}
            />
          </label>
          <label>
            Difficulty
            <select
              value={draft.difficulty}
              onChange={(event) => change("difficulty", event.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>
          <label>
            Accent Color
            <input
              aria-label="Accent Color"
              type="color"
              value={draft.color}
              onChange={(event) => change("color", event.target.value)}
            />
          </label>
          <IconBrowserField
            label="Trivia Set Icon"
            onSave={(iconId) => change("iconId", iconId)}
            value={draft.iconId}
          />
        </div>
        <label className="trivia-checkbox">
          <input
            checked={draft.pointsEnabled}
            onChange={(event) => change("pointsEnabled", event.target.checked)}
            type="checkbox"
          />
          Use points by default
        </label>
        <div className="trivia-form-grid">
          <label>
            Tags
            <input
              placeholder="animals, space"
              value={draft.tags}
              onChange={(event) => change("tags", event.target.value)}
            />
          </label>
          <label>
            Goals
            <input
              placeholder="engagement, turn taking"
              value={draft.goals}
              onChange={(event) => change("goals", event.target.value)}
            />
          </label>
          <label>
            Diagnoses
            <input
              value={draft.diagnoses}
              onChange={(event) => change("diagnoses", event.target.value)}
            />
          </label>
          <label>
            Age Ranges
            <input
              placeholder="7-12"
              value={draft.ageRanges}
              onChange={(event) => change("ageRanges", event.target.value)}
            />
          </label>
        </div>
        {error ? <p role="alert">{error}</p> : null}
        <div className="trivia-authoring-actions">
          <button
            className="studio-button studio-button--primary"
            disabled={saving}
            type="submit"
          >
            {saving ? "Creating…" : "Create Trivia Set"}
          </button>
          <button
            className="studio-button studio-button--secondary"
            disabled={saving}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
