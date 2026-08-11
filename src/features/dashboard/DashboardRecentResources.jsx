import { ArrowRight, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getResourceKey } from "../../models";

function resourceDestination(resource) {
  const id = encodeURIComponent(resource.id);

  if (resource.type === "prompt-deck") return `/prompts/${id}`;
  if (resource.type === "worksheet") return `/worksheets/${id}`;
  if (resource.type === "intervention") return `/interventions/${id}`;
  if (resource.type === "game") return `/games/${id}`;
  return "/saved";
}

function resourceTypeLabel(type) {
  if (type === "prompt-deck") return "Prompt Deck";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export default function DashboardRecentResources({ repository }) {
  const [recentResources, setRecentResources] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;

    repository
      .getRecentlyUsedResources({ limit: 3 })
      .then((resources) => {
        if (!active) return;
        setRecentResources(resources);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [repository]);

  if (status === "loading") {
    return <p role="status">Loading Recent Resources…</p>;
  }

  if (status === "error") {
    return (
      <p className="dashboard-memory-message" role="alert">
        Recent Resources are unavailable right now. Your saved Resources are still safe.
      </p>
    );
  }

  if (!recentResources.length) {
    return (
      <div className="dashboard-memory-message">
        <p>No recently used Resources yet.</p>
        <p>Complete a Prompt Deck or mark an Intervention used to find it here.</p>
      </div>
    );
  }

  return (
    <ul className="dashboard-recent-list">
      {recentResources.map(({ memory, resource }) => (
        <li key={getResourceKey(resource)}>
          <Link
            aria-label={`Continue ${resource.title}`}
            className="dashboard-recent-link"
            to={resourceDestination(resource)}
          >
            <span className="dashboard-recent-icon">
              <Clock3 aria-hidden="true" size={18} />
            </span>
            <span>
              <strong>{resource.title}</strong>
              <small>
                {resourceTypeLabel(resource.type)} · Used {memory.useCount} time
                {memory.useCount === 1 ? "" : "s"}
              </small>
            </span>
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
