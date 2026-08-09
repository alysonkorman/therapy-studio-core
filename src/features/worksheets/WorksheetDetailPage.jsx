import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { worksheetRepository } from "../../lib/data";

export default function WorksheetDetailPage({ repository = worksheetRepository }) {
  const { worksheetId } = useParams();
  const navigate = useNavigate();
  const [worksheet, setWorksheet] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    repository
      .getWorksheetById(worksheetId)
      .then(setWorksheet)
      .catch(() => setError("We couldn’t find that Worksheet."));
  }, [repository, worksheetId]);

  if (error)
    return (
      <section className="worksheet-route-message">
        <h1>Worksheet Not Found</h1>
        <p>{error}</p>
        <Link to="/worksheets">Back to Worksheet Library</Link>
      </section>
    );
  if (!worksheet) return <p role="status">Loading Worksheet…</p>;

  const starter = worksheet.provenance === "therapy-studio-starter";

  return (
    <section className="worksheet-detail">
      <p className="eyebrow">
        {starter ? "Therapy Studio Original" : "Editable Worksheet"}
      </p>
      <h1>{worksheet.title}</h1>
      {worksheet.description ? <p>{worksheet.description}</p> : null}
      <div className="worksheet-actions">
        {starter ? (
          <button
            onClick={async () => {
              const created = await repository.duplicateWorksheet(worksheet.id);
              navigate(`/worksheets/${created.resource.id}/build`);
            }}
            type="button"
          >
            Duplicate to Edit
          </button>
        ) : (
          <Link to={`/worksheets/${worksheet.id}/build`}>Build/Edit</Link>
        )}
        <Link to={`/worksheets/${worksheet.id}/preview`}>Preview</Link>
        <Link to={`/worksheets/${worksheet.id}/session`}>Open for Session</Link>
        <Link to="/worksheets">Back to Library</Link>
      </div>
    </section>
  );
}
