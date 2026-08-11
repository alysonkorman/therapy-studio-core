import { useRef, useState } from "react";

import { parseInterventionImportJson } from "../../engines/interventions/importInterventions";

export default function InterventionImportPanel({ onCancel, onImported, repository }) {
  const inputRef = useRef(null);
  const [pending, setPending] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(event) {
    const [file] = event.target.files;
    event.target.value = "";
    if (!file) return;
    setPending(null);
    setStatus(null);
    if (!file.name.toLowerCase().endsWith(".json")) {
      setStatus({ kind: "error", message: "Choose a .json Intervention file." });
      return;
    }
    try {
      setPending(parseInterventionImportJson(await file.text()));
    } catch (error) {
      setStatus({ kind: "error", message: error.message });
    }
  }

  async function confirmImport() {
    setBusy(true);
    setStatus(null);
    try {
      await repository.importInterventions(pending.interventions);
      setStatus({
        kind: "success",
        message: `${pending.interventions.length} ${pending.interventions.length === 1 ? "Intervention" : "Interventions"} imported.`,
      });
      setPending(null);
      await onImported?.();
    } catch (error) {
      setStatus({ kind: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="intervention-import" aria-labelledby="intervention-import-title">
      <div>
        <h2 id="intervention-import-title">Import Interventions</h2>
        <p>
          Choose a Therapy Studio Intervention JSON file. Nothing is saved until you
          confirm.
        </p>
      </div>
      <div className="intervention-import__actions">
        <button
          className="studio-button studio-button--secondary"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          Choose JSON
        </button>
        <button
          className="studio-button studio-button--secondary"
          disabled={busy}
          onClick={onCancel}
          type="button"
        >
          Close
        </button>
        <input
          ref={inputRef}
          accept="application/json,.json"
          aria-label="Choose Intervention import file"
          className="intervention-import__file"
          onChange={handleFile}
          type="file"
        />
      </div>
      {pending ? (
        <div className="intervention-import__preview">
          <h3>{pending.interventions.length} ready to import</h3>
          <ul>
            {pending.interventions.map(({ resource }) => (
              <li key={resource.id}>{resource.title}</li>
            ))}
          </ul>
          <button
            className="studio-button studio-button--primary"
            disabled={busy}
            onClick={confirmImport}
            type="button"
          >
            Confirm Import
          </button>
        </div>
      ) : null}
      {status ? (
        <p role={status.kind === "error" ? "alert" : "status"}>{status.message}</p>
      ) : null}
    </section>
  );
}
