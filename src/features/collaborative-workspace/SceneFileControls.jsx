import { Copy, FolderOpen, Plus, Save, Sparkles } from "lucide-react";
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
  const [templates, setTemplates] = useState([]);
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
      .listScenes("scene")
      .then(async (scenes) => {
        setSavedScenes(scenes);
        setTemplates(
          (await repository.listScenes("template")).filter(
            (scene) => scene.kind === "template"
          )
        );
      })
      .catch(() => setStatus("Saved scenes unavailable"));
  }, [repository]);

  async function refresh() {
    setSavedScenes(await repository.listScenes("scene"));
    setTemplates(
      (await repository.listScenes("template")).filter(
        (scene) => scene.kind === "template"
      )
    );
  }

  async function saveScene({ copy = false, kind = "scene" } = {}) {
    setStatus("Saving…");
    try {
      const payload = {
        id: copy || kind === "template" ? null : activeSceneId,
        title,
        workspaceDocument: document,
      };
      if (kind === "template") payload.kind = kind;
      const saved = await repository.saveScene(payload);
      if (kind === "scene") {
        setActiveSceneId(saved.id);
        setSelectedSceneId(saved.id);
      }
      setTitle(saved.title);
      setSavedFingerprint(fingerprint(saved.title, saved.workspaceDocument));
      await refresh();
      setStatus(
        kind === "template"
          ? "Template saved"
          : copy
            ? "Scene duplicated"
            : "Saved locally"
      );
    } catch {
      setStatus("Save failed");
    }
  }

  useEffect(() => {
    if (!activeSceneId || !hasUnsavedChanges) return undefined;
    const timer = window.setTimeout(() => void saveScene(), 900);
    return () => window.clearTimeout(timer);
  }, [activeSceneId, document, hasUnsavedChanges, title]);

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
        disabled={!title.trim()}
        onClick={() => void saveScene({ copy: true })}
        type="button"
      >
        <Copy aria-hidden="true" size={17} /> Duplicate
      </button>
      <button
        disabled={!title.trim()}
        onClick={() => void saveScene({ kind: "template" })}
        type="button"
      >
        <Sparkles aria-hidden="true" size={17} /> Template
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
      {templates.length ? (
        <label className="workspace-file-controls__saved">
          <select
            aria-label="Scene templates"
            onChange={async (event) => {
              if (!event.target.value) return;
              const saved = await repository.getScene(event.target.value);
              onLoad(saved.workspaceDocument);
              setActiveSceneId(null);
              setSelectedSceneId("");
              setTitle(`${saved.title} copy`);
              setSavedFingerprint(
                fingerprint(`${saved.title} copy`, saved.workspaceDocument)
              );
              setStatus("Template opened");
              event.target.value = "";
            }}
            defaultValue=""
          >
            <option value="">Templates…</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <span aria-live="polite" className="workspace-file-controls__status">
        {hasUnsavedChanges ? "Unsaved" : status}
      </span>
    </div>
  );
}
