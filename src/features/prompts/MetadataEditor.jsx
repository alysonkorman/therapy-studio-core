import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const fields = [
  ["diagnoses", "Diagnoses"],
  ["goals", "Goals"],
  ["ageRanges", "Age Ranges"],
  ["tags", "Tags"],
];

function parseValues(value) {
  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
}

export default function MetadataEditor({ value, onSave, collapsible = false }) {
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(fields.map(([field]) => [field, (value[field] ?? []).join(", ")]))
  );
  const [status, setStatus] = useState("");
  const [expanded, setExpanded] = useState(!collapsible);

  async function save() {
    setStatus("Saving…");
    try {
      await onSave(
        Object.fromEntries(fields.map(([field]) => [field, parseValues(drafts[field])]))
      );
      setStatus("Saved");
    } catch (error) {
      setStatus(error.message);
    }
  }

  const editor = (
    <fieldset className="metadata-editor" hidden={!expanded}>
      <legend>Clinical Metadata</legend>
      <div className="metadata-editor__fields">
        {fields.map(([field, label]) => (
          <label key={field}>
            {label}
            <input
              onChange={(event) =>
                setDrafts((current) => ({ ...current, [field]: event.target.value }))
              }
              placeholder="Comma-separated values"
              value={drafts[field]}
            />
          </label>
        ))}
      </div>
      <div className="metadata-editor__footer">
        <button className="button-primary" onClick={() => void save()} type="button">
          Save Metadata
        </button>
        {status ? <span aria-live="polite">{status}</span> : null}
      </div>
    </fieldset>
  );

  if (!collapsible) return editor;

  return (
    <section className="metadata-disclosure">
      <div className="metadata-disclosure__header">
        <h2>Clinical Metadata</h2>
        <button
          aria-expanded={expanded}
          aria-label={`${expanded ? "Hide" : "Show"} Clinical Metadata`}
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? "Hide" : "Show"}
          {expanded ? (
            <ChevronUp aria-hidden="true" size={17} />
          ) : (
            <ChevronDown aria-hidden="true" size={17} />
          )}
        </button>
      </div>
      {editor}
    </section>
  );
}
