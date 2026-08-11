import { useState } from "react";

import { parseTriviaImportJson } from "../../engines/games/importExportTrivia";

export default function TriviaImportPanel({ onClose, onImported, repository }) {
  const [validated, setValidated] = useState(null);
  const [status, setStatus] = useState("Choose a Therapy Studio Trivia JSON file.");
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
      const result = parseTriviaImportJson(await file.text());
      setValidated(result);
      setStatus(
        `${result.sets.length} Trivia ${result.sets.length === 1 ? "Set" : "Sets"} ready to import.`
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
      const imported = await repository.importTriviaSets(validated.sets);
      setValidated(null);
      setStatus(
        `${imported.length} Trivia ${imported.length === 1 ? "Set was" : "Sets were"} imported successfully.`
      );
      await onImported();
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="trivia-import-panel" aria-labelledby="trivia-import-title">
      <div>
        <h2 id="trivia-import-title">Import Trivia</h2>
        <p>{status}</p>
      </div>
      <label>
        Trivia JSON
        <input accept=".json,application/json" onChange={chooseFile} type="file" />
      </label>
      {validated ? (
        <div className="trivia-import-preview">
          <h3>Ready to Import</h3>
          <ul>
            {validated.sets.map((set) => (
              <li key={set.id}>{set.title}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <div className="trivia-authoring-actions">
        <button
          className="studio-button studio-button--primary"
          disabled={!validated || busy}
          onClick={confirmImport}
          type="button"
        >
          {busy ? "Importing…" : "Confirm Import"}
        </button>
        <button
          className="studio-button studio-button--secondary"
          disabled={busy}
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>
    </section>
  );
}
