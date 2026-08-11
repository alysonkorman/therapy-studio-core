import { FolderOpen, Plus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { savedSceneRepository } from "./savedSceneRepository";

const UNTITLED_SCENE = "Untitled Scene";

function fingerprint(title, document) {
  return JSON.stringify({ title: title.trim(), document });
}

export default function SceneFileControls({
  document,
  emptyDocument,
  onLoad,
  onNew,
  repository = savedSceneRepository,
}) {
  const [title, setTitle] = useState(UNTITLED_SCENE);
  const [activeSceneId, setActiveSceneId] = useState(null);
  const [selectedSceneId, setSelectedSceneId] = useState("");
  const [savedScenes, setSavedScenes] = useState([]);
  const [savedFingerprint, setSavedFingerprint] = useState(() =>
    fingerprint(UNTITLED_SCENE, emptyDocument)
  );
  const [confirmingNew, setConfirmingNew] = useState(false);
  const [status, setStatus] = useState("");
  const hasUnsavedChanges = useMemo(
    () => fingerprint(title, document) !== savedFingerprint,
    [document, savedFingerprint, title]
  );

  useEffect(() => {
    repository
      .listScenes()
      .then(setSavedScenes)
      .catch(() => setStatus("Saved scenes unavailable"));
  }, [repository]);

  async function saveScene() {
    setStatus("Saving…");
    try {
      const saved = await repository.saveScene({
        id: activeSceneId,
        title,
        workspaceDocument: document,
      });
      setActiveSceneId(saved.id);
      setSelectedSceneId(saved.id);
      setTitle(saved.title);
      setSavedFingerprint(fingerprint(saved.title, saved.workspaceDocument));
      setSavedScenes(await repository.listScenes());
      setStatus("Saved locally");
    } catch {
      setStatus("Save failed");
    }
  }

  async function loadScene() {
    if (!selectedSceneId) return;
    setStatus("Opening…");
    try {
      const saved = await repository.getScene(selectedSceneId);
      onLoad(saved.workspaceDocument);
      setActiveSceneId(saved.id);
      setTitle(saved.title);
      setSavedFingerprint(fingerprint(saved.title, saved.workspaceDocument));
      setConfirmingNew(false);
      setStatus("Opened");
    } catch {
      setStatus("Open failed");
    }
  }

  function startNewScene() {
    if (hasUnsavedChanges && !confirmingNew) {
      setConfirmingNew(true);
      return;
    }
    onNew();
    setTitle(UNTITLED_SCENE);
    setActiveSceneId(null);
    setSelectedSceneId("");
    setSavedFingerprint(fingerprint(UNTITLED_SCENE, emptyDocument));
    setConfirmingNew(false);
    setStatus("New scene");
  }

  return (
    <div className="workspace-file-controls" aria-label="Local scene files">
      <label>
        <span className="sr-only">Scene title</span>
        <input
          aria-label="Scene title"
          maxLength="120"
          onChange={(event) => {
            setTitle(event.target.value);
            setConfirmingNew(false);
            setStatus("");
          }}
          value={title}
        />
      </label>
      <button disabled={!title.trim()} onClick={saveScene} type="button">
        <Save aria-hidden="true" size={17} /> Save
      </button>
      <button
        className={confirmingNew ? "workspace-file-controls__confirm" : ""}
        onClick={startNewScene}
        type="button"
      >
        <Plus aria-hidden="true" size={17} />
        {confirmingNew ? "Start New Scene?" : "New"}
      </button>
      <label className="workspace-file-controls__saved">
        <span className="sr-only">Saved scenes</span>
        <select
          aria-label="Saved scenes"
          onChange={(event) => setSelectedSceneId(event.target.value)}
          value={selectedSceneId}
        >
          <option value="">Saved scenes…</option>
          {savedScenes.map((scene) => (
            <option key={scene.id} value={scene.id}>
              {scene.title}
            </option>
          ))}
        </select>
      </label>
      <button disabled={!selectedSceneId} onClick={loadScene} type="button">
        <FolderOpen aria-hidden="true" size={17} /> Open
      </button>
      <span aria-live="polite" className="workspace-file-controls__status">
        {hasUnsavedChanges ? "Unsaved" : status}
      </span>
    </div>
  );
}
