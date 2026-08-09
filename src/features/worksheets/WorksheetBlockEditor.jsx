import { useState } from "react";

const listFields = new Set(["items", "options"]);

function editableFields(block) {
  if (["heading", "instruction", "paragraph"].includes(block.type)) return ["text"];
  if (["short-response", "long-response", "drawing-area"].includes(block.type))
    return ["prompt"];
  if (["checklist", "multiple-choice", "feelings-scale"].includes(block.type))
    return ["prompt", block.type === "checklist" ? "items" : "options"];
  if (block.type === "rating-scale") return ["prompt", "minimumLabel", "maximumLabel"];
  return [];
}

export default function WorksheetBlockEditor({
  block,
  onApply,
  onDelete,
  onDuplicate,
  onMove,
  position,
  total,
}) {
  const [draft, setDraft] = useState(block);
  const fields = editableFields(block);

  return (
    <section className="worksheet-settings" aria-labelledby="block-settings-title">
      <h2 id="block-settings-title">Selected Block</h2>
      <p className="worksheet-block-type">{block.type.replaceAll("-", " ")}</p>
      {fields.map((field) => (
        <label key={field}>
          {field
            .replaceAll(/([A-Z])/g, " $1")
            .replace(/^./, (value) => value.toUpperCase())}
          <textarea
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                [field]: listFields.has(field)
                  ? event.target.value.split("\n").filter(Boolean)
                  : event.target.value,
              }))
            }
            rows={listFields.has(field) ? 5 : 3}
            value={listFields.has(field) ? draft[field].join("\n") : draft[field]}
          />
        </label>
      ))}
      {fields.length ? (
        <button onClick={() => onApply(draft)} type="button">
          Apply Block Changes
        </button>
      ) : (
        <p>This block has no text settings.</p>
      )}
      <div className="worksheet-actions">
        <button disabled={position === 0} onClick={() => onMove(-1)} type="button">
          Move Up
        </button>
        <button disabled={position === total - 1} onClick={() => onMove(1)} type="button">
          Move Down
        </button>
        <button onClick={onDuplicate} type="button">
          Duplicate
        </button>
        <button className="worksheet-delete" onClick={onDelete} type="button">
          Delete
        </button>
      </div>
    </section>
  );
}
