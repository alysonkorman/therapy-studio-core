import { useState } from "react";

import { parseWorksheetImportJson } from "../../engines/worksheets/importWorksheets";

export default function WorksheetImportPanel({ onCancel, onImported, repository }) {
  const [validated, setValidated] = useState(null);
  const [status, setStatus] = useState("Choose a Therapy Studio Worksheet JSON file.");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function chooseFile(event) {
    const file = event.target.files?.[0];
    setValidated(null);
    setError("");
    if (!file) return;
    if (!file.name.toLocaleLowerCase().endsWith(".json")) {
      setError("Choose a .json file.");
      return;
    }
    try {
      const result = parseWorksheetImportJson(await file.text());
      setValidated(result);
      setStatus(
        `${result.worksheets.length} ${result.worksheets.length === 1 ? "Worksheet" : "Worksheets"} ready to import.`
      );
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function confirmImport() {
    if (!validated) return;
    setBusy(true);
    setError("");
    try {
      const imported = await repository.importWorksheets(validated.worksheets);
      setValidated(null);
      setStatus(
        `${imported.length} ${imported.length === 1 ? "Worksheet was" : "Worksheets were"} imported successfully.`
      );
      await onImported();
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="worksheet-import-panel" aria-labelledby="worksheet-import-title">
      <div>
        <h2 id="worksheet-import-title">Import Worksheets</h2>
        <p>{status}</p>
      </div>
      <label>
        Worksheet JSON
        <input accept=".json,application/json" onChange={chooseFile} type="file" />
      </label>
      {validated ? (
        <div className="worksheet-import-preview">
          <h3>Ready to Import</h3>
          <ul>
            {validated.worksheets.map(({ resource }) => (
              <li key={resource.id}>{resource.title}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <div className="worksheet-actions">
        <button disabled={!validated || busy} onClick={confirmImport} type="button">
          {busy ? "Importing…" : "Confirm Import"}
        </button>
        <button disabled={busy} onClick={onCancel} type="button">
          Close
        </button>
      </div>
    </section>
  );
}
