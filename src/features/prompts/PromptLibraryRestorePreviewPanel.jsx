import { useRef, useState } from "react";

import { previewPromptLibraryBackupJson } from "../../engines/prompts/previewPromptLibraryBackup";
import { restorePromptLibraryRecovery } from "../../engines/prompts/restorePromptLibraryRecovery";
import { getTherapyStudioDatabase } from "../../lib/data/database";

export default function PromptLibraryRestorePreviewPanel() {
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [backup, setBackup] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [success, setSuccess] = useState("");
  const [selectedFilename, setSelectedFilename] = useState("");
  const inputRef = useRef(null);

  async function reviewFile(event) {
    const [file] = event.target.files ?? [];
    setError("");
    setPreview(null);
    setBackup(null);
    setSuccess("");
    setSelectedFilename(file?.name ?? "");
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setPreview(previewPromptLibraryBackupJson(text));
      setBackup(parsed);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "The selected backup could not be validated."
      );
    }
  }

  async function restoreIncludedBackup() {
    setError("");
    setPreview(null);
    setBackup(null);
    setSuccess("");
    setSelectedFilename("Therapy Studio prompt library backup");
    setRestoring(true);
    try {
      const response = await fetch("/prompt-library-backup.json");
      if (!response.ok) throw new Error("The included prompt backup is unavailable.");
      const text = await response.text();
      const parsed = JSON.parse(text);
      previewPromptLibraryBackupJson(text);
      const restored = await restorePromptLibraryRecovery({
        backup: parsed,
        database: getTherapyStudioDatabase(),
      });
      setSuccess(`Restore complete: ${restored.decks} decks · ${restored.prompts} prompts. Reloading your library…`);
      window.setTimeout(() => window.location.reload(), 700);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "The included prompt backup could not be read.");
    } finally {
      setRestoring(false);
    }
  }

  async function restoreBackup() {
    if (!backup || !preview?.restoreEligible || restoring) return;
    const { categories, decks, playlists, prompts } = preview.summary;
    if (
      !window.confirm(
        `Restore ${decks} decks, ${prompts} prompts, ${categories} categories, and ${playlists} playlists to this browser? The restore will stop without changing anything if an existing ID matches.`
      )
    )
      return;
    setRestoring(true);
    setError("");
    setSuccess("");
    try {
      const restored = await restorePromptLibraryRecovery({
        backup,
        database: getTherapyStudioDatabase(),
      });
      setSuccess(
        `Restore complete: ${restored.decks} decks · ${restored.prompts} prompts · ${restored.categories} categories · ${restored.playlists} playlists. Reload the page to view the restored library.`
      );
      setBackup(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "The backup could not be restored."
      );
    } finally {
      setRestoring(false);
    }
  }

  return (
    <section
      aria-labelledby="prompt-library-restore-preview-title"
      className="prompt-library-export"
    >
      <div>
        <h3 id="prompt-library-restore-preview-title">
          Restore Prompt Library from Backup
        </h3>
        <p>
          Preview only. Choosing a JSON backup does not change this browser, your account,
          or the Prompt Library.
        </p>
      </div>
      <div className="authoring-actions">
        <button className="button-primary" disabled={restoring} onClick={() => void restoreIncludedBackup()} type="button">
          {restoring ? "Restoring saved library…" : "Restore saved library now"}
        </button>
        <button onClick={() => inputRef.current?.click()} type="button">
          Choose backup JSON
        </button>
        <input
          ref={inputRef}
          accept="application/json,.json"
          aria-label="Choose Prompt Library backup JSON"
          className="sr-only"
          onChange={reviewFile}
          type="file"
        />
        <p aria-live="polite">{selectedFilename || "No backup file selected."}</p>
      </div>
      {preview ? (
        <div className="prompt-library-export__confirmation" role="status">
          <p>
            Validated backup: {preview.summary.decks} decks · {preview.summary.prompts}{" "}
            prompts · {preview.summary.categories} categories ·{" "}
            {preview.summary.playlists} playlists.
          </p>
          <p>
            Format: {preview.format}.{" "}
            {preview.restoreEligible ? "No records have been restored." : ""}
          </p>
          {preview.warning ? <p>{preview.warning}</p> : null}
          {preview.restoreEligible && backup ? (
            <button
              className="button-primary"
              disabled={restoring}
              onClick={() => void restoreBackup()}
              type="button"
            >
              {restoring ? "Restoring locally…" : "Restore to This Browser"}
            </button>
          ) : null}
        </div>
      ) : null}
      {success ? <p role="status">{success}</p> : null}
      {error ? (
        <p className="authoring-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
