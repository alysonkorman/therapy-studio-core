import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { resourceMemoryRepository, worksheetRepository } from "../../lib/data";
import WorksheetDocumentRenderer from "./WorksheetDocumentRenderer";
import "./WorksheetsPage.css";

export default function WorksheetSessionPage({
  memoryRepository = resourceMemoryRepository,
  repository = worksheetRepository,
}) {
  const { worksheetId } = useParams();
  const [worksheet, setWorksheet] = useState(null);
  const [document, setDocument] = useState(null);
  const [error, setError] = useState("");
  const useReported = useRef(false);

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

  useEffect(() => {
    if (!worksheet || useReported.current) return;
    useReported.current = true;
    void memoryRepository.markResourceUsed(worksheet.id).catch(() => {});
  }, [memoryRepository, worksheet]);

  if (error)
    return (
      <section className="worksheet-route-message">
        <h1>Worksheet Not Found</h1>
        <p>{error}</p>
        <Link to="/worksheets">Back to Worksheet Library</Link>
      </section>
    );
  if (!document || !worksheet) return <p role="status">Opening Worksheet…</p>;

  return (
    <div className="worksheet-session">
      <header className="worksheet-session-header">
        <h1>{worksheet.title}</h1>
        <Link to={`/worksheets/${worksheetId}`}>Return to Therapist View</Link>
      </header>
      <WorksheetDocumentRenderer document={document} />
    </div>
  );
}
