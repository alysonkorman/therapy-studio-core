import { useActiveSessionProfileStore } from "../../stores/activeSessionProfileStore";
import { getSessionProfileCompatibility } from "../../engines/resources/getSessionProfileCompatibility";

export default function ResourceCompatibilityIndicators({ resource }) {
  const profile = useActiveSessionProfileStore((state) => state.activeProfile);
  const indicators = getSessionProfileCompatibility(resource, profile);
  if (!indicators.length) return null;
  return (
    <ul
      aria-label={`Session Profile matches for ${resource.title}`}
      className="profile-compatibility"
    >
      {indicators.map((indicator) => (
        <li key={indicator}>{indicator}</li>
      ))}
    </ul>
  );
}
