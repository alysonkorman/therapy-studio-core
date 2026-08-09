import { Link } from "react-router-dom";

import ResourceCard from "../../components/ResourceCard";
import PromptDeckCard from "../prompts/PromptDeckCard";

function genericResultDestination(resource) {
  if (resource.type === "worksheet") {
    return { label: "Open Worksheet", path: `/worksheets/${resource.id}` };
  }
  if (resource.type === "intervention") {
    return {
      label: "Open Intervention",
      path: `/interventions/${encodeURIComponent(resource.id)}`,
    };
  }
  return null;
}

export default function ResourceSearchResult({ result }) {
  const { resource, matches } = result;
  const destination = genericResultDestination(resource);

  return (
    <section
      aria-label={`Search result: ${resource.title}`}
      className="resource-search-result"
    >
      <div className="resource-search-result__why">
        <span className="resource-type-badge">{resource.type}</span>
        <ul aria-label={`Why ${resource.title} matched`}>
          {matches.map((match) => (
            <li key={match}>{match}</li>
          ))}
        </ul>
      </div>

      {resource.type === "prompt-deck" ? (
        <PromptDeckCard deck={resource} />
      ) : (
        <div className="resource-search-result__generic">
          <ResourceCard resource={resource} />
          {destination ? (
            <Link
              className="studio-button studio-button--secondary"
              to={destination.path}
            >
              {destination.label}
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );
}
