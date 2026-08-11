import { LayoutTemplate, Shield, Square } from "lucide-react";

const icons = {
  "session-canvas-feelings-thermometer": LayoutTemplate,
  "session-canvas-blank-shield": Shield,
  "session-canvas-blank": Square,
};

export default function SessionCanvasStartPanel({ onUse, templates }) {
  return (
    <section
      aria-labelledby="session-canvas-start-title"
      className="session-canvas-start"
    >
      <div>
        <p className="eyebrow">Quick Start</p>
        <h2 id="session-canvas-start-title">Start With…</h2>
      </div>
      <div className="session-canvas-start__grid">
        {templates.map((template) => {
          const Icon = icons[template.id] ?? Square;
          return (
            <article className="session-canvas-template-card" key={template.id}>
              <Icon aria-hidden="true" size={26} />
              <div>
                <h3>{template.title}</h3>
                <p>{template.description}</p>
              </div>
              <button onClick={() => onUse(template)} type="button">
                Use Now
                <span className="sr-only">: {template.title}</span>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
