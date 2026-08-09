import "./layout.css";

export default function EmptyState({ action, description, headingLevel = 2, title }) {
  const Heading = headingLevel === 3 ? "h3" : "h2";

  return (
    <section className="studio-empty-state">
      <Heading>{title}</Heading>
      {description ? <p>{description}</p> : null}
      {action ? <div className="studio-empty-state__action">{action}</div> : null}
    </section>
  );
}
