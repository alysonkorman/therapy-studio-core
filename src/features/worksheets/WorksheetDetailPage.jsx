import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { worksheetRepository } from "../../lib/data";
import WorksheetDocumentRenderer from "./WorksheetDocumentRenderer";

export default function WorksheetDetailPage({ repository = worksheetRepository }) {
  const { worksheetId } = useParams();
  const navigate = useNavigate();
  const [worksheet, setWorksheet] = useState(null);
  const [document, setDocument] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      repository.getWorksheetById(worksheetId),
      repository.getWorksheetDocument(worksheetId),
    ])
      .then(([resource, worksheetDocument]) => {
        setWorksheet(resource);
        setDocument(worksheetDocument);
      })
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
  if (!worksheet || !document) return <p role="status">Loading Worksheet…</p>;

  const starter = worksheet.provenance === "therapy-studio-starter";

  return (
    <section className="worksheet-detail">
      <header className="worksheet-detail-header">
        <div className="worksheet-detail-heading">
          <p className="eyebrow">
            {starter ? "Therapy Studio Original" : "Editable Worksheet"}
          </p>
          <h1>{worksheet.title}</h1>
          {worksheet.description ? <p>{worksheet.description}</p> : null}
        </div>
        <div className="worksheet-actions worksheet-detail-actions">
          <Link
            className="worksheet-detail-primary-action"
            to={`/worksheets/${worksheet.id}/session`}
          >
            Open for Session
          </Link>
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
          <Link className="worksheet-detail-back" to="/worksheets">
            Back to Library
          </Link>
        </div>
      </header>
      <section aria-label="Worksheet preview" className="worksheet-detail-preview">
        <WorksheetDocumentRenderer document={document} />
      </section>
    </section>
  );
}
