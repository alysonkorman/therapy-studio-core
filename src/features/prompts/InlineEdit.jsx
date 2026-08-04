import { useState } from "react";

export default function InlineEdit({
  label,
  value,
  onSave,
  multiline = false,
  className = "",
  contentAsEditControl = false,
  displayValue,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!draft.trim()) {
      setError(`${label} is required.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(draft);
      setEditing(false);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(value);
    setError("");
    setEditing(false);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") cancel();
    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      void save();
    }
  }

  if (!editing) {
    const startEditing = () => {
      setDraft(value);
      setEditing(true);
    };

    return (
      <div className={`inline-edit ${className}`}>
        {contentAsEditControl ? (
          <button
            aria-label={`Edit ${label}: ${value}`}
            className="inline-edit__content-control"
            onClick={startEditing}
            type="button"
          >
            {displayValue ?? value}
          </button>
        ) : (
          <>
            {multiline ? (
              <p>{(displayValue ?? value) || "No Description"}</p>
            ) : (
              <span>{displayValue ?? value}</span>
            )}
            <button onClick={startEditing} type="button">
              Edit {label}
            </button>
          </>
        )}
      </div>
    );
  }

  const Input = multiline ? "textarea" : "input";
  return (
    <div className={`inline-edit inline-edit--active ${className}`}>
      <label>
        {label}
        <Input
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          value={draft}
        />
      </label>
      {error ? (
        <p className="authoring-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="authoring-actions">
        <button disabled={saving} onClick={() => void save()} type="button">
          {saving ? "Saving…" : "Save"}
        </button>
        <button disabled={saving} onClick={cancel} type="button">
          Cancel
        </button>
      </div>
    </div>
  );
}
