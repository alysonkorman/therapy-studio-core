import { Clock3, Monitor } from "lucide-react";
import { Link } from "react-router-dom";

import ResourceMemoryControls from "../resource-memory/ResourceMemoryControls";

export default function InterventionLibraryCard({ intervention, memoryRepository }) {
  return (
    <article className="intervention-library-card">
      <div>
        <span className="resource-type-badge">Intervention</span>
        <h2>{intervention.title}</h2>
        <p>{intervention.description}</p>
      </div>
      <div className="intervention-library-card__meta">
        {intervention.durationMinutes ? (
          <span>
            <Clock3 aria-hidden="true" size={16} />
            {intervention.durationMinutes} min
          </span>
        ) : null}
        {intervention.telehealthFriendly ? (
          <span>
            <Monitor aria-hidden="true" size={16} />
            Telehealth
          </span>
        ) : null}
        {intervention.ageRanges.length ? (
          <span>Ages {intervention.ageRanges.join(", ")}</span>
        ) : null}
      </div>
      <div className="intervention-library-card__goals">
        {intervention.goals.slice(0, 3).map((goal) => (
          <span key={goal}>{goal}</span>
        ))}
      </div>
      <div className="intervention-library-card__actions">
        <Link
          className="studio-button studio-button--primary"
          to={`/interventions/${intervention.id}`}
        >
          Open Intervention
        </Link>
        <ResourceMemoryControls
          repository={memoryRepository}
          resourceId={intervention.id}
        />
      </div>
    </article>
  );
}
