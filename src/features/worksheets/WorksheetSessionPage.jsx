import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { resourceMemoryRepository, worksheetRepository } from "../../lib/data";
import WorksheetDocumentRenderer from "./WorksheetDocumentRenderer";
import "./WorksheetsPage.css";

export default function WorksheetSessionPage({
  memoryRepository = resourceMemoryRepository,
  repository = worksheetRepository,
}) {
  const { worksheetId } = useParams();
  const navigate = useNavigate();
  const [worksheet, setWorksheet] = useState(null);
  const [document, setDocument] = useState(null);
  const [error, setError] = useState("");
  const [responses, setResponses] = useState({});
  const [savedCopy, setSavedCopy] = useState(null);
  const [saveStatus, setSaveStatus] = useState("");
  const useReported = useRef(false);

  useEffect(() => {
    Promise.all([
      repository.getWorksheetById(worksheetId),
      repository.getWorksheetDocument(worksheetId),
    ])
      .then(([resource, worksheetDocument]) => {
        setWorksheet(resource);
        setDocument(worksheetDocument);
        setResponses(worksheetDocument.sessionResponses ?? {});
      })
      .catch(() => setError("We couldn’t find that Worksheet."));
  }, [repository, worksheetId]);

  useEffect(() => {
    if (!worksheet || useReported.current) return;
    useReported.current = true;
    void memoryRepository.markResourceUsed(worksheet.id).catch(() => {});
  }, [memoryRepository, worksheet]);

  const initialResponses = useMemo(() => document?.sessionResponses ?? {}, [document]);
  const hasResponses = Object.keys(responses).length > 0;
  const dirty = JSON.stringify(responses) !== JSON.stringify(initialResponses);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function exitSession() {
    if (dirty && !window.confirm("Discard unsaved Worksheet responses?")) return;
    navigate(`/worksheets/${worksheetId}`);
  }

  async function saveCompletedCopy() {
    setSaveStatus("Saving completed copy…");
    try {
      const created = await repository.saveCompletedWorksheetCopy(worksheetId, responses);
      setSavedCopy(created.resource);
      setSaveStatus("Completed copy saved.");
    } catch {
      setSaveStatus("Completed copy could not be saved. Try again.");
    }
  }

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
        <div>
          <p className="eyebrow">Interactive Worksheet Session</p>
          <h1>{worksheet.title}</h1>
        </div>
        <div className="worksheet-session-controls">
          <button
            disabled={!hasResponses}
            onClick={() => {
              if (window.confirm("Reset all Worksheet responses?")) setResponses({});
            }}
            type="button"
          >
            Reset Responses
          </button>
          <button disabled={!hasResponses} onClick={saveCompletedCopy} type="button">
            Save Completed Copy
          </button>
          <button onClick={() => window.print()} type="button">
            Print / Save as PDF
          </button>
          <button onClick={exitSession} type="button">
            Exit Session
          </button>
        </div>
      </header>
      {saveStatus ? <p role="status">{saveStatus}</p> : null}
      {savedCopy ? (
        <p className="worksheet-session-saved-link">
          <Link to={`/worksheets/${savedCopy.id}/session`}>
            Open Saved Completed Copy
          </Link>
        </p>
      ) : null}
      <WorksheetDocumentRenderer
        document={document}
        interactive
        onResponseChange={(blockId, response) =>
          setResponses((current) => ({ ...current, [blockId]: response }))
        }
        responses={responses}
      />
    </div>
  );
}
