import { useState } from "react";

import {
  convertInterventionText,
  createInterventionPairFromReview,
} from "../../engines/interventions/convertInterventionDocument";
import { extractInterventionFile } from "../../engines/interventions/extractInterventionDocument";

const fileDetails = {
  txt: { accept: ".txt,text/plain", label: "TXT file" },
  docx: {
    accept:
      ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    label: "DOCX file",
  },
  pdf: { accept: ".pdf,application/pdf", label: "text-based PDF" },
};

const listFields = [
  ["goals", "Goals or Topics"],
  ["ageRanges", "Age Fit"],
  ["materials", "Materials"],
  ["whenToUse", "When to Use"],
  ["steps", "Steps"],
  ["therapistPrompts", "Therapist Prompts"],
  ["processingQuestions", "Processing Questions"],
  ["adaptations", "Adaptations"],
  ["cautions", "Cautions or Considerations"],
  ["tags", "Tags"],
];

function editableProposal(proposal) {
  return Object.fromEntries(
    Object.entries(proposal).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join("\n") : (value ?? ""),
    ])
  );
}

export default function InterventionConversionPanel({
  mode,
  onBack,
  onImported,
  repository,
}) {
  const [sourceText, setSourceText] = useState("");
  const [review, setReview] = useState(null);
  const [missing, setMissing] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState(false);

  function prepareReview(text, extractionWarnings = []) {
    const converted = convertInterventionText(text);
    setSourceText(converted.extractedText);
    setReview(editableProposal(converted.proposal));
    setMissing(converted.missing);
    setWarnings([...extractionWarnings, ...converted.warnings]);
    setError("");
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLocaleLowerCase().endsWith(`.${mode}`)) {
      setError(`Choose a .${mode} Intervention file.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await extractInterventionFile(file, mode);
      prepareReview(result.text, result.warnings);
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    setBusy(true);
    setError("");
    try {
      const pair = createInterventionPairFromReview(review);
      await repository.importInterventions([pair]);
      setImported(true);
      await onImported?.();
    } catch (caughtError) {
      setError(caughtError.details?.[0]?.message ?? caughtError.message);
    } finally {
      setBusy(false);
    }
  }

  const change = (field, value) =>
    setReview((current) => ({ ...current, [field]: value }));

  if (!review) {
    return (
      <section
        className="intervention-conversion"
        aria-labelledby="intervention-conversion-title"
      >
        <div>
          <h3 id="intervention-conversion-title">
            {mode === "paste"
              ? "Paste Intervention Text"
              : `Convert ${mode.toUpperCase()}`}
          </h3>
          <p>Nothing is saved until you review, edit, and confirm the conversion.</p>
        </div>
        {mode === "paste" ? (
          <label>
            Intervention text
            <textarea
              onChange={(event) => setSourceText(event.target.value)}
              rows={14}
              value={sourceText}
            />
          </label>
        ) : (
          <label>
            Choose {fileDetails[mode].label}
            <input
              accept={fileDetails[mode].accept}
              disabled={busy}
              onChange={handleFile}
              type="file"
            />
          </label>
        )}
        {error ? <p role="alert">{error}</p> : null}
        <div className="intervention-import__actions">
          {mode === "paste" ? (
            <button
              className="studio-button studio-button--primary"
              disabled={!sourceText.trim() || busy}
              onClick={() => {
                try {
                  prepareReview(sourceText);
                } catch (caughtError) {
                  setError(caughtError.message);
                }
              }}
              type="button"
            >
              Review Conversion
            </button>
          ) : null}
          <button
            className="studio-button studio-button--secondary"
            disabled={busy}
            onClick={onBack}
            type="button"
          >
            Back to Import Options
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="intervention-conversion-review" aria-labelledby="review-title">
      <div>
        <h3 id="review-title">Review Conversion</h3>
        <p>Extracted content is editable. Review every field before importing.</p>
      </div>
      {missing.length ? (
        <div className="intervention-conversion__notice" role="status">
          <strong>Needs review:</strong> {missing.join(", ")}
        </div>
      ) : null}
      {warnings.length ? (
        <div className="intervention-conversion__notice">
          <strong>Source warnings</strong>
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="intervention-conversion__grid">
        <label>
          Title
          <input
            onChange={(event) => change("title", event.target.value)}
            value={review.title}
          />
        </label>
        <label>
          Duration in minutes
          <input
            min="1"
            onChange={(event) => change("durationMinutes", event.target.value)}
            type="number"
            value={review.durationMinutes}
          />
        </label>
        <label>
          Telehealth suitability
          <select
            onChange={(event) =>
              change(
                "telehealthFriendly",
                event.target.value === "unknown" ? "" : event.target.value === "yes"
              )
            }
            value={
              review.telehealthFriendly === ""
                ? "unknown"
                : review.telehealthFriendly
                  ? "yes"
                  : "no"
            }
          >
            <option value="unknown">Not specified</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      </div>
      <label>
        Description
        <textarea
          onChange={(event) => change("description", event.target.value)}
          rows={3}
          value={review.description}
        />
      </label>
      <label>
        Overview
        <textarea
          onChange={(event) => change("overview", event.target.value)}
          rows={4}
          value={review.overview}
        />
      </label>
      <label>
        Introduction Language
        <textarea
          onChange={(event) => change("introduction", event.target.value)}
          rows={3}
          value={review.introduction}
        />
      </label>
      <div className="intervention-conversion__grid">
        {listFields.map(([field, label]) => (
          <label key={field}>
            {label} (one per line)
            <textarea
              onChange={(event) => change(field, event.target.value)}
              rows={4}
              value={review[field]}
            />
          </label>
        ))}
      </div>
      <label>
        Source or Attribution
        <textarea
          onChange={(event) => change("source", event.target.value)}
          rows={2}
          value={review.source}
        />
      </label>
      <label>
        Source Status and Usage Warnings
        <textarea
          onChange={(event) => change("sourceStatus", event.target.value)}
          rows={3}
          value={review.sourceStatus}
        />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      {imported ? <p role="status">Intervention imported successfully.</p> : null}
      <div className="intervention-import__actions">
        <button
          className="studio-button studio-button--primary"
          disabled={busy || imported}
          onClick={confirmImport}
          type="button"
        >
          {busy ? "Importing…" : imported ? "Imported" : "Confirm Import"}
        </button>
        <button
          className="studio-button studio-button--secondary"
          disabled={busy}
          onClick={() => setReview(null)}
          type="button"
        >
          Back to Source
        </button>
        <button
          className="studio-button studio-button--secondary"
          disabled={busy}
          onClick={onBack}
          type="button"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
