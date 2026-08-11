import { useState } from "react";

import { IconBrowserField } from "../icons";

const listFields = new Set(["choices", "items", "options"]);

function fieldLabel(field) {
  return field
    .replaceAll(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase());
}

function TextField({ draft, field, onChange }) {
  const list = listFields.has(field);
  return (
    <label>
      {fieldLabel(field)}
      <textarea
        onChange={(event) =>
          onChange(
            field,
            list ? event.target.value.split("\n").filter(Boolean) : event.target.value
          )
        }
        rows={list ? 5 : 3}
        value={list ? draft[field].join("\n") : draft[field]}
      />
    </label>
  );
}

function SelectField({ children, draft, field, numeric = false, onChange }) {
  return (
    <label>
      {fieldLabel(field)}
      <select
        onChange={(event) =>
          onChange(field, numeric ? Number(event.target.value) : event.target.value)
        }
        value={draft[field]}
      >
        {children}
      </select>
    </label>
  );
}

function CheckboxField({ draft, field, label, onChange }) {
  return (
    <label className="worksheet-checkbox-field">
      <input
        checked={draft[field]}
        onChange={(event) => onChange(field, event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}

function ResponseLineField({ draft, onChange }) {
  return (
    <label>
      Response Lines
      <input
        max="12"
        min="1"
        onChange={(event) => onChange("lineCount", Number(event.target.value))}
        type="number"
        value={draft.lineCount}
      />
    </label>
  );
}

function TableControls({ draft, onChange }) {
  return (
    <>
      <label>
        Column Headers (2–4, one per line)
        <textarea
          onChange={(event) =>
            onChange("headers", event.target.value.split("\n").slice(0, 4))
          }
          rows="4"
          value={draft.headers.join("\n")}
        />
      </label>
      <label>
        Rows (one row per line, separate cells with |)
        <textarea
          onChange={(event) =>
            onChange(
              "rows",
              event.target.value
                .split("\n")
                .slice(0, 12)
                .map((row) =>
                  row
                    .split("|")
                    .slice(0, 4)
                    .map((cell) => cell.trim())
                )
            )
          }
          rows="6"
          value={draft.rows.map((row) => row.join(" | ")).join("\n")}
        />
      </label>
      <p className="worksheet-field-help">
        Each row must contain the same number of cells as the column headers.
      </p>
    </>
  );
}

function ThoughtCheckControls({ draft, onChange }) {
  const labels = [
    ["situation", "Situation Label"],
    ["thought", "Thought Label"],
    ["feeling", "Feeling Label"],
    ["evidenceFor", "Evidence For Label"],
    ["evidenceAgainst", "Evidence Against Label"],
    ["balancedThought", "Balanced Thought Label"],
  ];
  return (
    <>
      {labels.map(([field, label]) => (
        <label key={field}>
          {label}
          <input
            onChange={(event) =>
              onChange("labels", { ...draft.labels, [field]: event.target.value })
            }
            value={draft.labels[field]}
          />
        </label>
      ))}
      <ResponseLineField draft={draft} onChange={onChange} />
    </>
  );
}

function TextControls({ block, draft, onChange }) {
  if (["heading", "instruction", "paragraph"].includes(block.type)) {
    return (
      <>
        <TextField draft={draft} field="text" onChange={onChange} />
        {block.type === "heading" ? (
          <SelectField draft={draft} field="level" numeric onChange={onChange}>
            <option value={1}>Large Heading</option>
            <option value={2}>Medium Heading</option>
            <option value={3}>Small Heading</option>
          </SelectField>
        ) : null}
        <SelectField draft={draft} field="alignment" onChange={onChange}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </SelectField>
      </>
    );
  }
  if (["short-response", "long-response"].includes(block.type)) {
    return (
      <>
        <TextField draft={draft} field="prompt" onChange={onChange} />
        <TextField draft={draft} field="placeholder" onChange={onChange} />
        <label>
          Response Lines
          <input
            max="12"
            min="1"
            onChange={(event) => onChange("lineCount", Number(event.target.value))}
            type="number"
            value={draft.lineCount}
          />
        </label>
      </>
    );
  }
  if (block.type === "drawing-area") {
    return (
      <>
        <TextField draft={draft} field="prompt" onChange={onChange} />
        <SelectField draft={draft} field="height" onChange={onChange}>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </SelectField>
      </>
    );
  }
  if (block.type === "visual") {
    return (
      <>
        <IconBrowserField
          actionLabel={draft.iconId ? "Change SVG" : "Choose SVG"}
          label="Worksheet Visual"
          onSave={(iconId) => onChange("iconId", iconId)}
          value={draft.iconId}
        />
        {draft.iconId ? (
          <button onClick={() => onChange("iconId", null)} type="button">
            Clear SVG
          </button>
        ) : null}
        <TextField draft={draft} field="label" onChange={onChange} />
        <CheckboxField
          draft={draft}
          field="decorative"
          label="Decorative visual (hide from screen readers)"
          onChange={onChange}
        />
        <SelectField draft={draft} field="size" onChange={onChange}>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </SelectField>
        <SelectField draft={draft} field="alignment" onChange={onChange}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </SelectField>
      </>
    );
  }
  if (block.type === "reflection") {
    return (
      <>
        <TextField draft={draft} field="title" onChange={onChange} />
        <TextField draft={draft} field="instruction" onChange={onChange} />
        <ResponseLineField draft={draft} onChange={onChange} />
      </>
    );
  }
  if (block.type === "basic-table") {
    return <TableControls draft={draft} onChange={onChange} />;
  }
  if (block.type === "sentence-completion") {
    return (
      <>
        <TextField draft={draft} field="textBefore" onChange={onChange} />
        <TextField draft={draft} field="textAfter" onChange={onChange} />
        <SelectField draft={draft} field="blankSize" onChange={onChange}>
          <option value="short">Short</option>
          <option value="medium">Medium</option>
          <option value="long">Long</option>
        </SelectField>
      </>
    );
  }
  if (block.type === "cbt-thought-check") {
    return <ThoughtCheckControls draft={draft} onChange={onChange} />;
  }
  if (block.type === "coping-plan") {
    return (
      <>
        <TextField draft={draft} field="triggerPrompt" onChange={onChange} />
        <TextField draft={draft} field="choicesPrompt" onChange={onChange} />
        <TextField draft={draft} field="choices" onChange={onChange} />
        <TextField draft={draft} field="tryPrompt" onChange={onChange} />
        <TextField draft={draft} field="helpedPrompt" onChange={onChange} />
        <ResponseLineField draft={draft} onChange={onChange} />
      </>
    );
  }
  if (block.type === "checklist") {
    return (
      <>
        <TextField draft={draft} field="prompt" onChange={onChange} />
        <TextField draft={draft} field="items" onChange={onChange} />
        <CheckboxField
          draft={draft}
          field="allowOther"
          label="Include an “Other” choice"
          onChange={onChange}
        />
      </>
    );
  }
  if (block.type === "multiple-choice") {
    return (
      <>
        <TextField draft={draft} field="prompt" onChange={onChange} />
        <TextField draft={draft} field="options" onChange={onChange} />
        <SelectField draft={draft} field="selectionMode" onChange={onChange}>
          <option value="single">Choose One</option>
          <option value="multiple">Choose More Than One</option>
        </SelectField>
      </>
    );
  }
  if (block.type === "feelings-scale") {
    return (
      <>
        <TextField draft={draft} field="prompt" onChange={onChange} />
        <TextField draft={draft} field="options" onChange={onChange} />
      </>
    );
  }
  if (block.type === "rating-scale") {
    return (
      <>
        <TextField draft={draft} field="prompt" onChange={onChange} />
        <div className="worksheet-setting-row">
          <label>
            Minimum
            <input
              max="9"
              min="0"
              onChange={(event) => onChange("minimum", Number(event.target.value))}
              type="number"
              value={draft.minimum}
            />
          </label>
          <label>
            Maximum
            <input
              max="10"
              min="1"
              onChange={(event) => onChange("maximum", Number(event.target.value))}
              type="number"
              value={draft.maximum}
            />
          </label>
        </div>
        <TextField draft={draft} field="minimumLabel" onChange={onChange} />
        <TextField draft={draft} field="maximumLabel" onChange={onChange} />
        <CheckboxField
          draft={draft}
          field="showNumbers"
          label="Show numbers on the scale"
          onChange={onChange}
        />
      </>
    );
  }
  if (block.type === "divider") {
    return (
      <SelectField draft={draft} field="style" onChange={onChange}>
        <option value="solid">Solid</option>
        <option value="dashed">Dashed</option>
        <option value="dotted">Dotted</option>
      </SelectField>
    );
  }
  if (block.type === "spacer") {
    return (
      <SelectField draft={draft} field="size" onChange={onChange}>
        <option value="small">Small</option>
        <option value="medium">Medium</option>
        <option value="large">Large</option>
      </SelectField>
    );
  }
  return null;
}

export default function WorksheetBlockEditor({
  block,
  onApply,
  onClearSelection,
  onDelete,
  onDuplicate,
  onMove,
  position,
  total,
}) {
  const [draft, setDraft] = useState(block);
  const updateDraft = (field, value) =>
    setDraft((current) => ({ ...current, [field]: value }));

  return (
    <section className="worksheet-settings" aria-labelledby="block-settings-title">
      <div className="worksheet-settings-heading">
        <div>
          <h2 id="block-settings-title">Selected Block</h2>
          <p className="worksheet-block-type">{block.type.replaceAll("-", " ")}</p>
        </div>
        <button onClick={onClearSelection} type="button">
          Clear Selection
        </button>
      </div>
      <TextControls block={block} draft={draft} onChange={updateDraft} />
      <button onClick={() => onApply(draft)} type="button">
        Apply Block Changes
      </button>
      <div className="worksheet-actions" aria-label="Selected Block Actions">
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
