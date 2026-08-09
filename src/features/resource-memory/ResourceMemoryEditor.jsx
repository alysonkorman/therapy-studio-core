import { useState } from "react";

function ListEditor({ label, values, onSave }) {
  const [items, setItems] = useState(values);
  const [draft, setDraft] = useState("");

  function addItem() {
    const value = draft.trim();
    if (!value || items.some((item) => item.toLowerCase() === value.toLowerCase()))
      return;
    setItems((current) => [...current, value]);
    setDraft("");
  }

  return (
    <fieldset className="resource-memory-list-editor">
      <legend>{label}</legend>
      {items.length ? (
        <ul className="resource-memory-chips">
          {items.map((item) => (
            <li key={item}>
              {item}
              <button
                aria-label={`Remove ${item} from ${label}`}
                onClick={() =>
                  setItems((current) => current.filter((value) => value !== item))
                }
                type="button"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="resource-memory-add-row">
        <input
          aria-label={`Add to ${label}`}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          value={draft}
        />
        <button onClick={addItem} type="button">
          Add
        </button>
        <button onClick={() => onSave(items)} type="button">
          Save
        </button>
      </div>
    </fieldset>
  );
}

export default function ResourceMemoryEditor({ memory, repository, resourceId, run }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(memory.therapistNotes);

  return (
    <section className="resource-memory-editor">
      <button
        aria-expanded={expanded}
        className="resource-memory-disclosure"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        Private Resource Memory <span aria-hidden="true">{expanded ? "▴" : "▾"}</span>
      </button>
      {expanded ? (
        <div>
          <p>Private resource notes. Do not enter identifying client information.</p>
          <p>
            Used {memory.useCount} {memory.useCount === 1 ? "time" : "times"}
            {memory.lastUsedAt
              ? ` · Last used ${new Date(memory.lastUsedAt).toLocaleDateString()}`
              : ""}
          </p>
          <label>
            Private Notes
            <textarea
              onChange={(event) => setNotes(event.target.value)}
              rows="4"
              value={notes}
            />
          </label>
          <div className="resource-memory-editor__actions">
            <button
              onClick={() =>
                void run(() => repository.updateTherapistNotes(resourceId, notes))
              }
              type="button"
            >
              Save Notes
            </button>
            <button onClick={() => setNotes(memory.therapistNotes)} type="button">
              Cancel
            </button>
          </div>
          <ListEditor
            label="Works Well When"
            onSave={(items) =>
              void run(() => repository.updateWorksWellWhen(resourceId, items))
            }
            values={memory.worksWellWhen}
          />
          <ListEditor
            label="Kids Who Usually Like This"
            onSave={(items) =>
              void run(() => repository.updateKidsWhoUsuallyLikeThis(resourceId, items))
            }
            values={memory.kidsWhoUsuallyLikeThis}
          />
          <ListEditor
            label="Adaptations"
            onSave={(items) =>
              void run(() => repository.updateAdaptations(resourceId, items))
            }
            values={memory.adaptations}
          />
        </div>
      ) : null}
    </section>
  );
}
