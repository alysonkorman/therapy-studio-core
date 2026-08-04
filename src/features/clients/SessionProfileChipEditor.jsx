import { useState } from "react";

export default function SessionProfileChipEditor({ label, onChange, values }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const value = draft.trim();
    if (
      !value ||
      values.some((item) => item.toLocaleLowerCase() === value.toLocaleLowerCase())
    )
      return;
    onChange([...values, value]);
    setDraft("");
  };
  return (
    <fieldset className="profile-chip-editor">
      <legend>{label}</legend>
      <div className="profile-chip-editor__list">
        {values.map((value) => (
          <span className="profile-chip" key={value}>
            {value}
            <button
              aria-label={`Remove ${value} from ${label}`}
              onClick={() => onChange(values.filter((item) => item !== value))}
              type="button"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="profile-chip-editor__add">
        <input
          aria-label={`Add ${label}`}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          value={draft}
        />
        <button onClick={add} type="button">
          Add
        </button>
      </div>
    </fieldset>
  );
}
