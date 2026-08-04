import { Heart } from "lucide-react";

import { resourceMemoryRepository } from "../../lib/data";
import ResourceMemoryEditor from "./ResourceMemoryEditor";
import useResourceMemory from "./useResourceMemory";
import "./ResourceMemory.css";

export default function ResourceMemoryControls({
  allowMarkUsed = false,
  onChange,
  repository = resourceMemoryRepository,
  resourceId,
  showEditor = false,
}) {
  const { error, loading, memory, run } = useResourceMemory(resourceId, repository);

  async function update(operation) {
    const result = await run(operation);
    if (result) onChange?.(result);
  }

  if (loading) return <p className="resource-memory-status">Loading Resource Memory…</p>;
  if (!memory)
    return <p className="resource-memory-status">Resource Memory unavailable.</p>;

  return (
    <div className="resource-memory-controls">
      <div className="resource-memory-controls__row">
        <button
          aria-pressed={memory.favorite}
          className={memory.favorite ? "is-favorite" : ""}
          onClick={() => void update(() => repository.toggleFavorite(resourceId))}
          type="button"
        >
          <Heart
            aria-hidden="true"
            fill={memory.favorite ? "currentColor" : "none"}
            size={18}
          />
          {memory.favorite ? "Favorite" : "Add Favorite"}
        </button>
        <fieldset className="resource-memory-rating">
          <legend>Rating</legend>
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              aria-label={`Rate ${rating} out of 5`}
              aria-pressed={memory.rating === rating}
              key={rating}
              onClick={() => void update(() => repository.setRating(resourceId, rating))}
              type="button"
            >
              {rating <= (memory.rating ?? 0) ? "★" : "☆"}
            </button>
          ))}
          {memory.rating ? (
            <button
              onClick={() => void update(() => repository.clearRating(resourceId))}
              type="button"
            >
              Clear
            </button>
          ) : null}
        </fieldset>
        {allowMarkUsed ? (
          <button
            onClick={() => void update(() => repository.markResourceUsed(resourceId))}
            type="button"
          >
            Mark Used
          </button>
        ) : null}
      </div>
      {memory.lastUsedAt ? (
        <p className="resource-memory-last-used">
          Recently Used · {new Date(memory.lastUsedAt).toLocaleDateString()}
        </p>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      {showEditor ? (
        <ResourceMemoryEditor
          key={memory.updatedAt}
          memory={memory}
          repository={repository}
          resourceId={resourceId}
          run={run}
        />
      ) : null}
    </div>
  );
}
