import { useState } from "react";

import { downloadPromptLibraryStoredRecordsExport } from "./downloadPromptLibraryStoredRecordsExport";

export default function PromptLibraryExportPanel({ decks, repository }) {
  const [snapshot, setSnapshot] = useState(null);
  const [message, setMessage] = useState("");

  async function prepareExport() {
    setMessage("");
    try {
      const nextSnapshot = await repository.createPromptLibraryStoredRecordsExport({
        visibleDeckIds: decks.map(({ id }) => id),
      });
      setSnapshot(nextSnapshot);
    } catch {
      setMessage(
        "The backup could not be prepared. Your Prompt Library was not changed."
      );
    }
  }

  function downloadExport() {
    try {
      downloadPromptLibraryStoredRecordsExport(snapshot);
      setMessage(
        "The verified Prompt Library backup was downloaded. Your library was not changed."
      );
    } catch {
      setMessage(
        "The backup could not be downloaded. Your Prompt Library was not changed."
      );
    }
  }

  const summary = snapshot?.summary;
  return (
    <section
      aria-labelledby="prompt-library-export-title"
      className="prompt-library-export"
    >
      <div>
        <h3 id="prompt-library-export-title">Back Up Prompt Library</h3>
        <p>Creates a read-only JSON copy of the Prompt records stored in this browser.</p>
      </div>
      {!snapshot ? (
        <button onClick={() => void prepareExport()} type="button">
          Review backup
        </button>
      ) : (
        <div className="prompt-library-export__confirmation" role="status">
          <p>
            Ready to download: {summary.decks} decks · {summary.prompts} prompts ·{" "}
            {summary.categories} categories · {summary.playlists} playlists.
          </p>
          <p>
            Serialization issues: {summary.serializationFailures.length}. Visible decks
            missing from the export: {summary.missingVisibleDeckIds.length}.
          </p>
          <div className="authoring-actions">
            <button className="button-primary" onClick={downloadExport} type="button">
              Download verified JSON backup
            </button>
            <button onClick={() => setSnapshot(null)} type="button">
              Cancel
            </button>
          </div>
        </div>
      )}
      {message ? <p aria-live="polite">{message}</p> : null}
    </section>
  );
}
