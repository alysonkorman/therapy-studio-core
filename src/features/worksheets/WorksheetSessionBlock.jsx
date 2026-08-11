import WorksheetBlockRenderer from "./WorksheetBlockRenderer";

const valueFor = (response, key, fallback = "") => response?.[key] ?? fallback;

function TextResponse({ block, onChange, readOnly, response, multiline = false }) {
  const Input = multiline ? "textarea" : "input";
  const label = block.prompt ?? block.title;
  return (
    <section className="worksheet-session-response">
      {block.title ? <h3>{block.title}</h3> : <p>{block.prompt}</p>}
      {block.instruction ? <p>{block.instruction}</p> : null}
      <Input
        aria-label={`Response for ${label}`}
        className="worksheet-session-text"
        onChange={(event) => onChange({ text: event.target.value })}
        placeholder={block.placeholder}
        readOnly={readOnly}
        rows={multiline ? block.lineCount : undefined}
        type={multiline ? undefined : "text"}
        value={valueFor(response, "text")}
      />
    </section>
  );
}

function ChoiceResponse({ block, onChange, readOnly, response }) {
  const choices = block.type === "checklist" ? block.items : block.options;
  const selected = response?.selected ?? [];
  const multiple = block.type === "checklist" || block.selectionMode === "multiple";
  return (
    <section className="worksheet-session-response">
      <p>{block.prompt}</p>
      <div className="worksheet-session-choices">
        {choices.map((choice, index) => (
          <label key={`${index}-${choice}`}>
            <input
              checked={selected.includes(index)}
              disabled={readOnly}
              name={multiple ? undefined : block.id}
              onChange={() => {
                const next = multiple
                  ? selected.includes(index)
                    ? selected.filter((value) => value !== index)
                    : [...selected, index]
                  : [index];
                onChange({ ...response, selected: next });
              }}
              type={multiple ? "checkbox" : "radio"}
            />
            {choice}
          </label>
        ))}
        {block.type === "checklist" && block.allowOther ? (
          <label>
            Other
            <input
              aria-label={`Other response for ${block.prompt}`}
              disabled={readOnly}
              onChange={(event) =>
                onChange({ ...response, otherText: event.target.value })
              }
              type="text"
              value={valueFor(response, "otherText")}
            />
          </label>
        ) : null}
      </div>
    </section>
  );
}

function FieldsResponse({ block, onChange, readOnly, response }) {
  const entries =
    block.type === "cbt-thought-check"
      ? Object.entries(block.labels)
      : [
          ["trigger", block.triggerPrompt],
          ["try", block.tryPrompt],
          ["helped", block.helpedPrompt],
        ];
  const fields = response?.fields ?? {};
  return (
    <section
      aria-label={
        block.type === "cbt-thought-check" ? "CBT Thought Check" : "Coping Plan"
      }
      className="worksheet-structured-block worksheet-session-fields"
    >
      {entries.map(([key, label]) => (
        <label key={key}>
          <span>{label}</span>
          <textarea
            onChange={(event) =>
              onChange({ ...response, fields: { ...fields, [key]: event.target.value } })
            }
            readOnly={readOnly}
            rows={block.lineCount}
            value={fields[key] ?? ""}
          />
        </label>
      ))}
      {block.type === "coping-plan" ? (
        <fieldset disabled={readOnly}>
          <legend>{block.choicesPrompt}</legend>
          {block.choices.map((choice, index) => (
            <label key={`${index}-${choice}`}>
              <input
                checked={(response?.selected ?? []).includes(index)}
                onChange={() => {
                  const selected = response?.selected ?? [];
                  onChange({
                    ...response,
                    selected: selected.includes(index)
                      ? selected.filter((value) => value !== index)
                      : [...selected, index],
                  });
                }}
                type="checkbox"
              />
              {choice}
            </label>
          ))}
        </fieldset>
      ) : null}
    </section>
  );
}

export default function WorksheetSessionBlock({ block, onChange, readOnly, response }) {
  if (block.type === "short-response" || block.type === "long-response") {
    return (
      <TextResponse
        block={block}
        multiline={block.type === "long-response"}
        onChange={onChange}
        readOnly={readOnly}
        response={response}
      />
    );
  }
  if (block.type === "reflection") {
    return (
      <TextResponse
        block={block}
        multiline
        onChange={onChange}
        readOnly={readOnly}
        response={response}
      />
    );
  }
  if (block.type === "sentence-completion") {
    return (
      <label className="worksheet-sentence-completion worksheet-session-sentence">
        <span>{block.textBefore} </span>
        <input
          aria-label={`Complete sentence: ${block.textBefore}`}
          onChange={(event) => onChange({ text: event.target.value })}
          readOnly={readOnly}
          type="text"
          value={valueFor(response, "text")}
        />
        {block.textAfter ? <span> {block.textAfter}</span> : null}
      </label>
    );
  }
  if (block.type === "checklist" || block.type === "multiple-choice") {
    return (
      <ChoiceResponse
        block={block}
        onChange={onChange}
        readOnly={readOnly}
        response={response}
      />
    );
  }
  if (block.type === "rating-scale") {
    const values = Array.from(
      { length: block.maximum - block.minimum + 1 },
      (_, index) => block.minimum + index
    );
    return (
      <fieldset className="worksheet-session-rating" disabled={readOnly}>
        <legend>{block.prompt}</legend>
        <span>{block.minimumLabel}</span>
        {values.map((value) => (
          <label key={value}>
            <input
              checked={response?.rating === value}
              name={block.id}
              onChange={() => onChange({ rating: value })}
              type="radio"
            />
            {value}
          </label>
        ))}
        <span>{block.maximumLabel}</span>
      </fieldset>
    );
  }
  if (block.type === "basic-table") {
    const cells = response?.cells ?? block.rows;
    return (
      <div className="worksheet-table-wrap">
        <table className="worksheet-basic-table worksheet-session-table">
          <thead>
            <tr>
              {block.headers.map((header, index) => (
                <th key={`${index}-${header}`}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>
                    <input
                      aria-label={`${block.headers[cellIndex]} row ${rowIndex + 1}`}
                      onChange={(event) => {
                        const next = block.rows.map((sourceRow, sourceIndex) => [
                          ...(cells[sourceIndex] ?? sourceRow),
                        ]);
                        next[rowIndex][cellIndex] = event.target.value;
                        onChange({ cells: next });
                      }}
                      readOnly={readOnly}
                      value={cells[rowIndex]?.[cellIndex] ?? cell}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.type === "cbt-thought-check" || block.type === "coping-plan") {
    return (
      <FieldsResponse
        block={block}
        onChange={onChange}
        readOnly={readOnly}
        response={response}
      />
    );
  }
  return <WorksheetBlockRenderer block={block} />;
}
