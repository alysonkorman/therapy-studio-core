import { ChevronDown, ChevronUp, Clock3, Heart, Monitor } from "lucide-react";
import { useState } from "react";

import "./ResourceCard.css";

function DetailSection({ title, items }) {
  if (!items?.length) return null;

  return (
    <section className="resource-card-section">
      <h3>{title}</h3>

      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function Rating({ value }) {
  if (value === null || value === undefined) {
    return <span className="resource-card-unrated">Not rated</span>;
  }

  return (
    <div aria-label={`${value} out of 5 stars`} className="resource-card-rating">
      {Array.from({ length: 5 }, (_, index) => (
        <span aria-hidden="true" key={index}>
          {index < Math.round(value) ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}

export default function ResourceCard({ resource }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <article className="resource-card">
      <header className="resource-card-header">
        <div>
          <span className="resource-type-badge">{resource.type}</span>
          <h2>{resource.title}</h2>
          <p className="resource-card-description">{resource.description}</p>
        </div>

        <button
          aria-label={
            resource.favorite
              ? `Remove ${resource.title} from favorites`
              : `Add ${resource.title} to favorites`
          }
          className={`resource-favorite-button ${resource.favorite ? "is-favorite" : ""}`}
          type="button"
        >
          <Heart fill={resource.favorite ? "currentColor" : "none"} size={21} />
        </button>
      </header>

      <div className="resource-card-summary">
        <Rating value={resource.rating} />

        {resource.durationMinutes !== null && (
          <span>
            <Clock3 size={17} />
            {resource.durationMinutes} min
          </span>
        )}

        {resource.telehealthFriendly && (
          <span>
            <Monitor size={17} />
            Telehealth
          </span>
        )}

        {resource.ageRanges?.length > 0 && (
          <span>Ages {resource.ageRanges.join(", ")}</span>
        )}
      </div>

      <div className="resource-card-content-grid">
        <DetailSection items={resource.worksWellWhen} title="Works Well When" />

        <DetailSection items={resource.kidsWhoLike} title="Kids Who Usually Like This" />

        <DetailSection items={resource.goals} title="Uses" />

        <DetailSection items={resource.materials} title="Requires" />

        <DetailSection items={resource.useWith} title="Use With" />
      </div>

      {showAdvanced && (
        <div className="resource-card-advanced">
          <DetailSection items={resource.research} title="Supporting Research" />

          {resource.source && (
            <section className="resource-card-section">
              <h3>Source</h3>
              <p>{resource.source}</p>
            </section>
          )}

          {resource.myNotes && (
            <section className="resource-card-section">
              <h3>My Notes</h3>
              <p>{resource.myNotes}</p>
            </section>
          )}

          <section className="resource-card-section">
            <h3>Use History</h3>
            <p>
              Used {resource.usageCount} {resource.usageCount === 1 ? "time" : "times"}
            </p>
          </section>
        </div>
      )}

      <button
        aria-expanded={showAdvanced}
        className="resource-advanced-button"
        onClick={() => setShowAdvanced((current) => !current)}
        type="button"
      >
        {showAdvanced ? (
          <>
            Hide Advanced
            <ChevronUp size={18} />
          </>
        ) : (
          <>
            Show Advanced
            <ChevronDown size={18} />
          </>
        )}
      </button>
    </article>
  );
}
