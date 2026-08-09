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
  if (block.type === "divider")
    return <hr className={`worksheet-divider--${block.style}`} />;
  if (block.type === "spacer")
    return <div className={`worksheet-spacer--${block.size}`} aria-hidden="true" />;
  return null;
}
