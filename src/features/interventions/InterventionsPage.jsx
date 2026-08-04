import ResourceCard from "../../components/ResourceCard";
import { interventions } from "../../data/resources";

export default function InterventionsPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <span className="eyebrow">Resource Library</span>
          <h1>Interventions</h1>
        </div>
      </div>

      <div className="resource-list">
        {interventions.map((resource) => (
          <ResourceCard allowMarkUsed key={resource.id} resource={resource} />
        ))}
      </div>
    </>
  );
}
