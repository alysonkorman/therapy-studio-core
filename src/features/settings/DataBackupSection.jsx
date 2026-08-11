import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "../../components/ui";
import { backupRepository, parseBackupJson } from "../../lib/data";

function backupFilename(exportedAt) {
  return `therapy-studio-backup-${exportedAt.slice(0, 10)}.json`;
}

function downloadBackup(backup) {
  const blob = new Blob([`${JSON.stringify(backup, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = backupFilename(backup.exportedAt);
  link.click();
  URL.revokeObjectURL(url);
}

export default function DataBackupSection({ repository = backupRepository }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [pendingBackup, setPendingBackup] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    setStatus(null);
    try {
      const backup = await repository.exportBackup();
      downloadBackup(backup);
      setStatus({ kind: "success", message: "Your backup file was downloaded." });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error?.message ?? "Therapy Studio could not create a backup.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(event) {
    const [file] = event.target.files;
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setStatus(null);
    setPendingBackup(null);
    try {
      const backup = parseBackupJson(await file.text());
      setPendingBackup(backup);
    } catch (error) {
      setStatus({
        kind: "error",
        message: error?.message ?? "Therapy Studio could not read this backup file.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    setBusy(true);
    setStatus(null);
    try {
      await repository.restoreBackup(pendingBackup);
      setPendingBackup(null);
      setStatus({
        kind: "success",
        message:
          "Backup restored. Reopen any active Therapy Studio pages to see the restored data.",
      });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error?.message ?? "Therapy Studio could not restore this backup.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="data-backup-title" className="settings-backup">
      <div className="settings-backup__heading">
        <div>
          <p className="settings-backup__eyebrow">Local Data</p>
          <h2 id="data-backup-title">Data &amp; Backup</h2>
        </div>
        <p>Data is currently stored only in this browser.</p>
      </div>

      <div className="settings-backup__notice">
        <strong>Store backup files securely.</strong>
        <p>
          A backup may contain private clinical information, including therapist notes and
          Session Profiles. Therapy Studio downloads it to your device and does not upload
          it.
        </p>
      </div>

      <div className="settings-backup__actions">
        <Button disabled={busy} onClick={handleExport}>
          <Download aria-hidden="true" size={18} />
          Export Backup
        </Button>
        <Button
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          variant="secondary"
        >
          <Upload aria-hidden="true" size={18} />
          Restore Backup
        </Button>
        <input
          ref={inputRef}
          accept="application/json,.json"
          aria-label="Choose Therapy Studio backup file"
          className="settings-backup__file-input"
          onChange={handleFile}
          type="file"
        />
      </div>

      {pendingBackup ? (
        <div className="settings-backup__confirmation" role="alert">
          <h3>Replace local Therapy Studio data?</h3>
          <p>
            This will replace Resources, Prompt categories and playlists, Resource Memory,
            Session Profiles, editable Worksheets, and imported Interventions stored in
            this browser. Built-in Interventions and Worksheet starters will remain
            available.
          </p>
          <div className="settings-backup__confirmation-actions">
            <Button disabled={busy} onClick={handleRestore}>
              Replace Local Data
            </Button>
            <Button
              disabled={busy}
              onClick={() => setPendingBackup(null)}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {status ? (
        <p
          className={`settings-backup__status settings-backup__status--${status.kind}`}
          role={status.kind === "error" ? "alert" : "status"}
        >
          {status.message}
        </p>
      ) : null}
    </section>
  );
}
