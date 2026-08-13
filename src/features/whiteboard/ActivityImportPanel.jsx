import { useState } from "react";

import {
  loadPdfPages,
  readImageFile,
  renderPdfPage,
  validateActivityFile,
} from "../../engines/whiteboard/activityImport";

export default function ActivityImportPanel({ onCancel, onImport }) {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("activity");
  const [pdf, setPdf] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function choose(selected) {
    setError("");
    setPdf(null);
    setPageCount(0);
    try {
      validateActivityFile(selected);
      setFile(selected);
      if (selected.type === "application/pdf") {
        setBusy(true);
        const loaded = await loadPdfPages(selected);
        setPdf(loaded.pdf);
        setPageCount(loaded.pageCount);
      }
    } catch (reason) {
      setFile(null);
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const media = pdf
        ? await renderPdfPage(pdf, pageNumber)
        : await readImageFile(file);
      await onImport({ ...media, mode, sourceName: file.name });
    } catch (reason) {
      setError(reason.message || "Therapy Studio could not open this activity.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="activity-import-title" className="activity-import-panel">
      <div className="activity-import-panel__heading">
        <div>
          <p className="eyebrow">Local File</p>
          <h2 id="activity-import-title">Add Activity</h2>
        </div>
        <button onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
      <p>Choose a PDF or image. Nothing is uploaded.</p>
      <label>
        Activity file
        <input
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          onChange={(event) => void choose(event.target.files?.[0])}
          type="file"
        />
      </label>
      <fieldset>
        <legend>How should it open?</legend>
        <label>
          <input
            checked={mode === "activity"}
            name="activity-mode"
            onChange={() => setMode("activity")}
            type="radio"
          />
          Open as Activity — fit, center, and lock behind marks
        </label>
        <label>
          <input
            checked={mode === "object"}
            name="activity-mode"
            onChange={() => setMode("object")}
            type="radio"
          />
          Insert as Object — move, resize, or delete normally
        </label>
      </fieldset>
      {pageCount > 1 ? (
        <label>
          PDF page
          <select
            aria-label="PDF page"
            onChange={(event) => setPageNumber(Number(event.target.value))}
            value={pageNumber}
          >
            {Array.from({ length: pageCount }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                Page {index + 1}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {file ? (
        <p>
          Ready: {file.name}
          {pageCount ? ` (${pageCount} page${pageCount === 1 ? "" : "s"})` : ""}
        </p>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <button
        disabled={!file || busy || (file.type === "application/pdf" && !pdf)}
        onClick={() => void confirm()}
        type="button"
      >
        {busy
          ? "Preparing…"
          : mode === "activity"
            ? "Open as Activity"
            : "Insert as Object"}
      </button>
    </section>
  );
}
