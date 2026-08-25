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
  const columnCount = draft.headers.length;
  const setShape = (headers) => {
    onChange("headers", headers);
    onChange(
      "rows",
      Array.from({ length: 3 }, () => Array.from({ length: headers.length }, () => ""))
    );
  };
  const updateHeader = (index, value) =>
    onChange(
      "headers",
      draft.headers.map((header, headerIndex) =>
        headerIndex === index ? value : header
      )
    );
  const updateCell = (rowIndex, columnIndex, value) =>
    onChange(
      "rows",
      draft.rows.map((row, currentRowIndex) =>
        currentRowIndex === rowIndex
          ? row.map((cell, currentColumnIndex) =>
              currentColumnIndex === columnIndex ? value : cell
            )
          : row
      )
    );
  const addColumn = () => {
    if (columnCount >= 4) return;
    onChange("headers", [...draft.headers, `Column ${columnCount + 1}`]);
    onChange(
      "rows",
      draft.rows.map((row) => [...row, ""])
    );
  };
  const removeColumn = () => {
    if (columnCount <= 2) return;
    onChange("headers", draft.headers.slice(0, -1));
    onChange(
      "rows",
      draft.rows.map((row) => row.slice(0, -1))
    );
  };
  const addRow = () => {
    if (draft.rows.length >= 12) return;
    onChange("rows", [
      ...draft.rows,
      Array.from({ length: columnCount }, () => ""),
    ]);
  };
  const removeRow = (rowIndex) => {
    if (draft.rows.length <= 1) return;
    onChange(
      "rows",
      draft.rows.filter((_, currentRowIndex) => currentRowIndex !== rowIndex)
    );
  };

  return (
    <div className="worksheet-table-composer">
      <div className="worksheet-table-composer__presets" aria-label="Starting shapes">
        <span>Start with</span>
        <button onClick={() => setShape(["Side A", "Side B"])} type="button">
          Two Sides
        </button>
        <button
          onClick={() => setShape(["Column 1", "Column 2", "Column 3"])}
          type="button"
        >
          3 Columns
        </button>
        <button
          onClick={() =>
            setShape(["Column 1", "Column 2", "Column 3", "Column 4"])
          }
          type="button"
        >
          4 Columns
        </button>
      </div>
      <div className="worksheet-table-composer__controls">
        <button disabled={columnCount >= 4} onClick={addColumn} type="button">
          Add Column
        </button>
        <button disabled={columnCount <= 2} onClick={removeColumn} type="button">
          Remove Column
        </button>
        <button disabled={draft.rows.length >= 12} onClick={addRow} type="button">
          Add Row
        </button>
      </div>
      <div className="worksheet-table-composer__grid-wrap">
        <table className="worksheet-table-composer__grid">
          <thead>
            <tr>
              {draft.headers.map((header, columnIndex) => (
                <th key={columnIndex}>
                  <label className="sr-only" htmlFor={`table-header-${columnIndex}`}>
                    Column {columnIndex + 1} header
                  </label>
                  <input
                    id={`table-header-${columnIndex}`}
                    onChange={(event) => updateHeader(columnIndex, event.target.value)}
                    value={header}
                  />
                </th>
              ))}
              <th aria-label="Row actions" />
            </tr>
          </thead>
          <tbody>
            {draft.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, columnIndex) => (
                  <td key={columnIndex}>
                    <label
                      className="sr-only"
                      htmlFor={`table-cell-${rowIndex}-${columnIndex}`}
                    >
                      Row {rowIndex + 1}, column {columnIndex + 1}
                    </label>
                    <input
                      id={`table-cell-${rowIndex}-${columnIndex}`}
                      onChange={(event) =>
                        updateCell(rowIndex, columnIndex, event.target.value)
                      }
                      value={cell}
                    />
                  </td>
                ))}
                <td className="worksheet-table-composer__row-action">
                  <button
                    aria-label={`Remove row ${rowIndex + 1}`}
                    disabled={draft.rows.length <= 1}
                    onClick={() => removeRow(rowIndex)}
                    type="button"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="worksheet-field-help">
        Edit any header or cell directly. The first column can be used for row labels.
      </p>
    </div>
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

function TextControls({
  block,
  draft,
  freeform,
  onChange,
  onVisualPlacement,
  visualPlacement,
  onVisualPlacementChange,
}) {
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
          <option value="xl">XL</option>
        </SelectField>
      </>
    );
  }
  if (block.type === "visual") {
    const placementMode = visualPlacement;
    const isBackground = freeform && block.layout?.locked && block.layout?.zIndex === 0;
    return (
      <>
        {freeform ? (
          <SelectField
            draft={{ placementMode }}
            field="placementMode"
            onChange={(_, value) => onVisualPlacementChange(value)}
          >
            <option value="large">Add Large & Centered</option>
            <option value="background">Add as Background</option>
            <option value="normal">Add Normally</option>
          </SelectField>
        ) : null}
        <IconBrowserField
          actionLabel={
            isBackground
              ? "Replace Background"
              : draft.iconId
                ? "Change SVG"
                : "Choose SVG"
          }
          label="Worksheet Visual"
          onSave={(iconId) => {
            if (freeform && onVisualPlacement) {
              onVisualPlacement(iconId, placementMode);
              onChange("iconId", iconId);
              return;
            }
            onChange("iconId", iconId);
          }}
          value={draft.iconId}
        />
        {isBackground ? (
          <p className="worksheet-field-help">Background • Locked</p>
        ) : null}
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
          <option value="xl">XL</option>
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
  if (block.type === "line") {
    return (
      <>
        <TextField draft={draft} field="label" onChange={onChange} />
        <div className="worksheet-setting-row">
          <label>
            Stroke Color
            <input
              type="color"
              value={draft.strokeColor}
              onChange={(event) => onChange("strokeColor", event.target.value)}
            />
          </label>
          <label>
            Stroke Width
            <input
              max="12"
              min="1"
              type="number"
              value={draft.strokeWidth}
              onChange={(event) => onChange("strokeWidth", Number(event.target.value))}
            />
          </label>
        </div>
        <CheckboxField
          draft={draft}
          field="arrowhead"
          label="Show arrowhead"
          onChange={onChange}
        />
      </>
    );
  }
  if (block.type === "spacer") {
    return (
      <SelectField draft={draft} field="size" onChange={onChange}>
        <option value="small">Small</option>
        <option value="medium">Medium</option>
        <option value="large">Large</option>
        <option value="xl">XL</option>
      </SelectField>
    );
  }
  return null;
}

export default function WorksheetBlockEditor({
  block,
  layout,
  onApply,
  onClearSelection,
  onDelete,
  onDuplicate,
  onMove,
  onVisualPlacement,
  position,
  total,
}) {
  const [draft, setDraft] = useState(block);
  const [visualPlacement, setVisualPlacement] = useState(
    layout?.locked && layout?.zIndex === 0 ? "normal" : "large"
  );
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
      <TextControls
        block={{ ...block, layout }}
        draft={draft}
        freeform={Boolean(layout)}
        onChange={updateDraft}
        onVisualPlacement={onVisualPlacement}
        visualPlacement={visualPlacement}
        onVisualPlacementChange={setVisualPlacement}
      />
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
          {block.type === "basic-table" ? "Duplicate Section" : "Duplicate"}
        </button>
        <button className="worksheet-delete" onClick={onDelete} type="button">
          Delete
        </button>
      </div>
    </section>
  );
}
