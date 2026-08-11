import { IconRenderer } from "../icons";

function ResponseLines({ count }) {
  return (
    <div
      aria-hidden="true"
      className={`worksheet-response-lines worksheet-response-lines--${count}`}
    />
  );
}

export default function WorksheetBlockRenderer({ block }) {
  if (block.type === "heading") {
    const Heading = `h${block.level}`;
    return <Heading style={{ textAlign: block.alignment }}>{block.text}</Heading>;
  }
  if (block.type === "instruction" || block.type === "paragraph") {
    return (
      <p
        className={`worksheet-block--${block.type}`}
        style={{ textAlign: block.alignment }}
      >
        {block.text}
      </p>
    );
  }
  if (block.type === "short-response" || block.type === "long-response") {
    return (
      <section>
        <p>{block.prompt}</p>
        <div
          className={`worksheet-response-lines worksheet-response-lines--${block.lineCount}`}
          aria-hidden="true"
        />
      </section>
    );
  }
  if (block.type === "checklist") {
    return (
      <section>
        <p>{block.prompt}</p>
        <ul className="worksheet-choice-list">
          {block.items.map((item) => (
            <li key={item}>☐ {item}</li>
          ))}
          {block.allowOther ? <li>☐ Other: ____________________</li> : null}
        </ul>
      </section>
    );
  }
  if (block.type === "multiple-choice") {
    return (
      <section>
        <p>{block.prompt}</p>
        <ul className="worksheet-choice-list">
          {block.options.map((option) => (
            <li key={option}>
              {block.selectionMode === "multiple" ? "☐" : "○"} {option}
            </li>
          ))}
        </ul>
      </section>
    );
  }
  if (block.type === "rating-scale") {
    const values = Array.from(
      { length: block.maximum - block.minimum + 1 },
      (_, index) => block.minimum + index
    );
    return (
      <section>
        <p>{block.prompt}</p>
        <div className="worksheet-scale">
          <span>{block.minimumLabel}</span>
          {values.map((value) => (
            <span key={value}>{block.showNumbers ? value : "○"}</span>
          ))}
          <span>{block.maximumLabel}</span>
        </div>
      </section>
    );
  }
  if (block.type === "feelings-scale") {
    return (
      <section>
        <p>{block.prompt}</p>
        <div className="worksheet-feelings-scale">
          {block.options.map((option) => (
            <span key={option}>{option}</span>
          ))}
        </div>
      </section>
    );
  }
  if (block.type === "drawing-area") {
    return (
      <section>
        <p>{block.prompt}</p>
        <div
          className={`worksheet-drawing-area worksheet-drawing-area--${block.height}`}
        />
      </section>
    );
  }
  if (block.type === "visual") {
    return (
      <figure
        className={`worksheet-visual worksheet-visual--${block.size} worksheet-visual--${block.alignment}`}
      >
        <IconRenderer
          alt={block.label || undefined}
          className="worksheet-visual__asset"
          decorative={block.decorative}
          iconId={block.iconId}
          size={256}
        />
        {!block.decorative && block.label ? <figcaption>{block.label}</figcaption> : null}
      </figure>
    );
  }
  if (block.type === "reflection") {
    return (
      <section className="worksheet-structured-block worksheet-reflection">
        <h3>{block.title}</h3>
        {block.instruction ? <p>{block.instruction}</p> : null}
        <ResponseLines count={block.lineCount} />
      </section>
    );
  }
  if (block.type === "basic-table") {
    return (
      <div className="worksheet-table-wrap">
        <table className="worksheet-basic-table">
          <thead>
            <tr>
              {block.headers.map((header, index) => (
                <th key={`${index}-${header}`} scope="col">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell || " "}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.type === "sentence-completion") {
    return (
      <p className="worksheet-sentence-completion">
        <span>{block.textBefore} </span>
        <span
          aria-label="Blank response area"
          className={`worksheet-inline-blank worksheet-inline-blank--${block.blankSize}`}
        />
        {block.textAfter ? <span> {block.textAfter}</span> : null}
      </p>
    );
  }
  if (block.type === "cbt-thought-check") {
    return (
      <section
        aria-label="CBT Thought Check"
        className="worksheet-structured-block worksheet-thought-check"
      >
        {Object.entries(block.labels).map(([field, label]) => (
          <section className={`worksheet-thought-check__${field}`} key={field}>
            <h3>{label}</h3>
            <ResponseLines count={block.lineCount} />
          </section>
        ))}
      </section>
    );
  }
  if (block.type === "coping-plan") {
    return (
      <section
        aria-label="Coping Plan"
        className="worksheet-structured-block worksheet-coping-plan"
      >
        <section>
          <h3>{block.triggerPrompt}</h3>
          <ResponseLines count={block.lineCount} />
        </section>
        <section>
          <h3>{block.choicesPrompt}</h3>
          <ul className="worksheet-choice-list">
            {block.choices.map((choice, index) => (
              <li key={`${index}-${choice}`}>☐ {choice}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3>{block.tryPrompt}</h3>
          <ResponseLines count={block.lineCount} />
        </section>
        <section>
          <h3>{block.helpedPrompt}</h3>
          <ResponseLines count={block.lineCount} />
        </section>
      </section>
    );
  }
  if (block.type === "divider")
    return <hr className={`worksheet-divider--${block.style}`} />;
  if (block.type === "spacer")
    return <div className={`worksheet-spacer--${block.size}`} aria-hidden="true" />;
  return null;
}
