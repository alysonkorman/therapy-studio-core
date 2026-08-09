import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { worksheetRepository } from "../../lib/data";
import WorksheetDocumentRenderer from "./WorksheetDocumentRenderer";
import "./WorksheetsPage.css";
import "./WorksheetPrint.css";

export default function WorksheetPreviewPage({ repository = worksheetRepository }) {
  const { worksheetId } = useParams();
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

  if (error) {
    return (
      <section className="worksheet-route-message">
        <h1>Worksheet Not Found</h1>
        <p>{error}</p>
        <Link to="/worksheets">Back to Worksheet Library</Link>
      </section>
    );
  }
  if (!document || !worksheet) return <p role="status">Loading Preview…</p>;

  const starter = worksheet.provenance === "therapy-studio-starter";

  return (
    <div className="worksheet-preview">
      <header className="worksheet-preview-controls">
        <div>
          <p className="eyebrow">Worksheet Preview</p>
          <h1>{worksheet.title}</h1>
        </div>
        <div className="worksheet-actions">
          {starter ? (
            <Link to={`/worksheets/${worksheetId}`}>Worksheet Details</Link>
          ) : (
            <Link to={`/worksheets/${worksheetId}/build`}>Return to Builder</Link>
          )}
          <Link to={`/worksheets/${worksheetId}/session`}>Open for Session</Link>
          <button onClick={() => window.print()} type="button">
            Print / Save as PDF
          </button>
        </div>
      </header>
      <WorksheetDocumentRenderer document={document} />
    </div>
  );
}
