import { useMemo, useState } from "react";

export default function BulkAddPrompts({ onAdd }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const prompts = useMemo(
    () =>
      draft
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    [draft]
  );

  async function add() {
    setError("");
    try {
      await onAdd(prompts);
      setDraft("");
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  return (
    <section className="bulk-add authoring-subsection">
      <h3>Bulk Add Prompts</h3>
      <label>
        One Prompt Per Line
        <textarea onChange={(event) => setDraft(event.target.value)} value={draft} />
      </label>
      <p>{prompts.length} prompts ready to add</p>
      {error ? (
        <p className="authoring-error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="button-primary"
        disabled={!prompts.length}
        onClick={() => void add()}
        type="button"
      >
        Review Complete — Add Prompts
      </button>
    </section>
  );
}
