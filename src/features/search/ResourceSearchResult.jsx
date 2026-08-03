import ResourceCard from "../../components/ResourceCard";
import PromptDeckCard from "../prompts/PromptDeckCard";

export default function ResourceSearchResult({ result }) {
  const { resource, matches } = result;

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
        <ResourceCard resource={resource} />
      )}
    </section>
  );
}
