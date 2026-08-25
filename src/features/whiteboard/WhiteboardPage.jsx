import { nanoid } from "nanoid";
import { Redo2, RotateCcw, Save, Trash2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  addWhiteboardObject,
  clearWhiteboard,
  commitHistory,
  createHistory,
  deleteWhiteboardObject,
  duplicateWhiteboardObject,
  moveWhiteboardObjectLayer,
  redoHistory,
  resetWhiteboardMarks,
  setWhiteboardImageBackground,
  undoHistory,
  updateWhiteboardObject,
} from "../../engines/whiteboard/whiteboardOperations";
import { instantiateSessionCanvasTemplate } from "../../engines/whiteboard/sessionCanvasTemplates";
import { fitActivity } from "../../engines/whiteboard/activityImport";
import { eraseWhiteboardObjects } from "../../engines/whiteboard/whiteboardErase";
import { sessionCanvasTemplates } from "../../data/sessionCanvasTemplates";
import { localMediaRepository, whiteboardRepository } from "../../lib/data";
import { createBlankWhiteboardDocument, whiteboardDocumentSchema } from "../../models";
import { IconBrowserField } from "../icons";
import LiveSessionPanel from "../live-sessions/LiveSessionPanel";
import { useLiveSession } from "../live-sessions/useLiveSession";
import { createLiveSession } from "../../models/liveSession";
import { createProductionWebSocketTransport } from "../live-sessions/productionWebSocketTransport";
import {
  createRemoteLiveSession,
  getHostRoomCredential,
  endRemoteLiveSession,
} from "../live-sessions/liveSessionApi";
import {
  captureCognitoHostToken,
  consumePendingLiveSessionInvite,
  getCognitoHostToken,
  hasConfiguredLiveSessionBackend,
  liveSessionLoginUrl,
  rememberPendingLiveSessionInvite,
} from "../live-sessions/liveSessionHostAuth";
import WhiteboardCanvas from "./WhiteboardCanvas";
import ActivityImportPanel from "./ActivityImportPanel";
import ParticipantStickerPicker from "./ParticipantStickerPicker";
import SessionCanvasStartPanel from "./SessionCanvasStartPanel";
import { createWhiteboardCollaborationAdapter } from "./whiteboardCollaborationAdapter";
import {
  projectWhiteboardForLiveSession,
  whiteboardLiveSessionAdapter,
} from "./whiteboardLiveSessionAdapter";
import WhiteboardToolbar from "./WhiteboardToolbar";
import "./WhiteboardPage.css";

const colors = [
  "#28252C",
  "#B14C4C",
  "#2F766D",
  "#3867A6",
  "#D17A22",
  "#E4B83F",
  "#67529D",
];
const shapeTools = new Set(["rectangle", "ellipse", "arrow"]);

function blank(createId) {
  return createBlankWhiteboardDocument({ id: createId(), now: new Date().toISOString() });
}

function moveObject(object, dx, dy) {
  if (object.kind === "arrow")
    return {
      x1: object.x1 + dx,
      y1: object.y1 + dy,
      x2: object.x2 + dx,
      y2: object.y2 + dy,
    };
  return { x: object.x + dx, y: object.y + dy };
}

function participantUrlFor(created) {
  return new URL(created.participantUrl, window.location.origin).toString();
}

export default function WhiteboardPage({
  collaborationFactory = createWhiteboardCollaborationAdapter,
  createId = () => nanoid(),
  liveSession: suppliedLiveSession = null,
  repository = whiteboardRepository,
  mediaRepository = localMediaRepository,
}) {
  const [history, setHistory] = useState(() => createHistory(blank(createId)));
  const [tool, setTool] = useState(() =>
    suppliedLiveSession?.role === "participant" ? "draw" : "select"
  );
  const [strokeColor, setStrokeColor] = useState(colors[0]);
  const [fillColor, setFillColor] = useState("transparent");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [textSize, setTextSize] = useState(32);
  const [draftObject, setDraftObject] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [gesture, setGesture] = useState(null);
  const [savedBoards, setSavedBoards] = useState([]);
  const [showOpen, setShowOpen] = useState(false);
  const [showIcons, setShowIcons] = useState(false);
  const [showChildStickers, setShowChildStickers] = useState(false);
  const [participantPicker, setParticipantPicker] = useState(null);
  const [showStarters, setShowStarters] = useState(true);
  const [showActivityImport, setShowActivityImport] = useState(false);
  const [message, setMessage] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hostLiveSession, setHostLiveSession] = useState(null);
  const [liveSettings, setLiveSettings] = useState({
    participantPermission: "everything",
    participantPreset: "young",
  });
  const [sessionView, setSessionView] = useState(false);
  const adapterRef = useRef(null);
  const createLiveSessionRef = useRef(null);
  const participantId = useRef(createId());
  const temporaryAssetIds = useRef(new Set());
  const pendingInviteHandled = useRef(false);
  const activePointerId = useRef(null);
  const erasePoints = useRef([]);
  const document = history.present;
  const documentRef = useRef(document);
  const activeLiveSession = suppliedLiveSession ?? hostLiveSession;
  const participantMode = activeLiveSession?.role === "participant";
  const selected = useMemo(
    () => document.objects.find(({ id }) => id === selectedId),
    [document.objects, selectedId]
  );
  const selectedIndex = selected
    ? document.objects.findIndex(({ id }) => id === selected.id)
    : -1;
  const background = useMemo(
    () => document.objects.find(({ kind, background }) => kind === "image" && background),
    [document.objects]
  );

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  const applyRemoteSharedState = useCallback((sharedState) => {
    const current = documentRef.current;
    setHistory(
      createHistory({
        ...current,
        objects: sharedState.objects,
      })
    );
    setLiveSettings(sharedState.session);
  }, []);

  // A transport factory is an effect dependency inside useLiveSession. Keep it
  // stable across Whiteboard document updates so completing a stroke does not
  // disconnect and replace the active production WebSocket.
  const productionTransportFactory = useMemo(() => {
    const credential = activeLiveSession?.credential;
    if (!credential) return undefined;
    return (options) =>
      createProductionWebSocketTransport({
        ...options,
        credential,
      });
  }, [activeLiveSession?.credential]);

  const live = useLiveSession({
    adapter: whiteboardLiveSessionAdapter,
    onRemoteState: applyRemoteSharedState,
    role: activeLiveSession?.role,
    sessionId: activeLiveSession?.sessionId,
    sharedState: projectWhiteboardForLiveSession(document, liveSettings),
    transportFactory: productionTransportFactory,
  });

  const liveEnded = Boolean(activeLiveSession && live.status === "ended");

  useEffect(() => {
    if (activeLiveSession) return undefined;
    const adapter = collaborationFactory({
      boardId: document.id,
      participantId: participantId.current,
      onRemoteDocument(remote) {
        const result = whiteboardDocumentSchema.safeParse(remote);
        if (result.success) setHistory(createHistory(result.data));
      },
    });
    adapterRef.current = adapter;
    return () => adapter.close();
  }, [activeLiveSession, collaborationFactory, document.id]);

  function commit(next) {
    if (liveEnded) return;
    setHistory((current) => commitHistory(current, next));
    if (activeLiveSession)
      live.publishState(projectWhiteboardForLiveSession(next, liveSettings));
    else adapterRef.current?.publish(next);
  }

  function point(event) {
    const surface = event.currentTarget.ownerSVGElement ?? event.currentTarget;
    const bounds = surface.getBoundingClientRect();
    return {
      x: pan.x + ((event.clientX - bounds.left) / (bounds.width || 1000)) * (1000 / zoom),
      y: pan.y + ((event.clientY - bounds.top) / (bounds.height || 700)) * (700 / zoom),
    };
  }

  function canvasPointerDown(event) {
    if (liveEnded) return;
    if (event.pointerType === "touch" && event.isPrimary === false) return;
    if (activePointerId.current !== null && activePointerId.current !== event.pointerId)
      return;
    activePointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const location = point(event);
    if (tool === "erase") {
      erasePoints.current = [location];
      setGesture({ type: "erase" });
      return;
    }
    if (tool === "draw") {
      setDraftObject({
        id: createId(),
        kind: "stroke",
        points: [location],
        color: strokeColor,
        width: strokeWidth,
      });
    } else if (shapeTools.has(tool)) {
      const base = { id: createId(), kind: tool, strokeColor, strokeWidth };
      setDraftObject(
        tool === "arrow"
          ? { ...base, x1: location.x, y1: location.y, x2: location.x, y2: location.y }
          : { ...base, x: location.x, y: location.y, width: 8, height: 8, fillColor }
      );
      setGesture({ type: "create", start: location });
    } else if (tool === "text") {
      const object = {
        id: createId(),
        kind: "text",
        text: "Text",
        ...location,
        color: strokeColor,
        size: textSize,
      };
      commit(addWhiteboardObject(document, object));
      setSelectedId(object.id);
      setTool("select");
    } else if (tool === "pan") {
      setGesture({ type: "pan", start: { x: event.clientX, y: event.clientY }, pan });
    } else if (tool === "select") setSelectedId(null);
  }

  function pointerMove(event) {
    if (liveEnded) return;
    if (activePointerId.current !== event.pointerId) return;
    const location = point(event);
    if (draftObject?.kind === "stroke") {
      setDraftObject((current) => ({
        ...current,
        points: [...current.points, location],
      }));
    } else if (draftObject && gesture?.type === "create") {
      if (draftObject.kind === "arrow")
        setDraftObject((current) => ({ ...current, x2: location.x, y2: location.y }));
      else
        setDraftObject((current) => ({
          ...current,
          x: Math.min(gesture.start.x, location.x),
          y: Math.min(gesture.start.y, location.y),
          width: Math.max(8, Math.abs(location.x - gesture.start.x)),
          height: Math.max(8, Math.abs(location.y - gesture.start.y)),
        }));
    } else if (gesture?.type === "move") {
      setHistory((current) => ({
        ...current,
        present: updateWhiteboardObject(
          gesture.document,
          gesture.object.id,
          moveObject(
            gesture.object,
            location.x - gesture.start.x,
            location.y - gesture.start.y
          )
        ),
      }));
    } else if (gesture?.type === "resize") {
      const { object } = gesture;
      const changes =
        object.kind === "arrow"
          ? { x2: location.x, y2: location.y }
          : object.kind === "text"
            ? {
                size: Math.max(
                  12,
                  Math.min(96, object.size + location.x - gesture.start.x)
                ),
              }
            : object.kind === "image"
              ? {
                  width: Math.max(32, location.x - object.x),
                  height:
                    Math.max(32, location.x - object.x) * (object.height / object.width),
                }
              : {
                  width: Math.max(32, location.x - object.x),
                  height: Math.max(32, location.y - object.y),
                };
      setHistory((current) => ({
        ...current,
        present: updateWhiteboardObject(gesture.document, object.id, changes),
      }));
    } else if (gesture?.type === "pan") {
      setPan({
        x: gesture.pan.x - (event.clientX - gesture.start.x) / zoom,
        y: gesture.pan.y - (event.clientY - gesture.start.y) / zoom,
      });
    } else if (gesture?.type === "erase") {
      const previous = erasePoints.current.at(-1);
      if (!previous || Math.hypot(location.x - previous.x, location.y - previous.y) >= 3)
        erasePoints.current.push(location);
    }
  }

  function pointerUp(event) {
    if (liveEnded) return;
    if (activePointerId.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    activePointerId.current = null;
    if (draftObject) {
      const valid = draftObject.kind !== "stroke" || draftObject.points.length > 1;
      if (valid) {
        commit(addWhiteboardObject(document, draftObject));
        setSelectedId(draftObject.id);
      }
      setDraftObject(null);
    } else if (["move", "resize"].includes(gesture?.type)) {
      setHistory((current) => {
        const next = {
          past: [...current.past, gesture.document],
          present: current.present,
          future: [],
        };
        if (activeLiveSession)
          live.publishState(projectWhiteboardForLiveSession(next.present, liveSettings));
        else adapterRef.current?.publish(next.present);
        return next;
      });
    } else if (gesture?.type === "erase" && erasePoints.current.length) {
      const points = erasePoints.current;
      if (activeLiveSession)
        live.requestAction({ type: "whiteboard/erase", points, radius: 18 });
      else {
        const erased = eraseWhiteboardObjects(document.objects, points, 18);
        if (erased.before.length) commit({ ...document, objects: erased.objects });
      }
    }
    erasePoints.current = [];
    setGesture(null);
  }

  function pointerCancel(event) {
    if (activePointerId.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    activePointerId.current = null;
    erasePoints.current = [];
    setDraftObject(null);
    setGesture(null);
  }

  function objectPointerDown(event, object) {
    if (liveEnded || object.locked) return;
    if (tool === "erase") return;
    if (tool !== "select") return;
    event.stopPropagation();
    setSelectedId(object.id);
    setGesture({ type: "move", document, object, start: point(event) });
  }

  async function refreshSaved() {
    setSavedBoards(await repository.listWhiteboards());
  }

  async function save() {
    const saved = await repository.saveWhiteboard(document);
    saved.objects
      .filter(({ kind }) => kind === "image")
      .forEach(({ assetId }) => temporaryAssetIds.current.delete(assetId));
    setHistory(createHistory(saved));
    setMessage("Whiteboard saved locally.");
  }

  function startNew() {
    if (
      document.objects.length &&
      !window.confirm("Start a new Whiteboard? Unsaved changes will be lost.")
    )
      return;
    document.objects
      .filter(
        ({ kind, assetId }) => kind === "image" && temporaryAssetIds.current.has(assetId)
      )
      .forEach(({ assetId }) => {
        temporaryAssetIds.current.delete(assetId);
        void mediaRepository.deleteAsset(assetId);
      });
    setHistory(createHistory(blank(createId)));
    setSelectedId(null);
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setMessage("");
    setShowStarters(true);
  }

  async function importActivity({ blob, width, height, mode, sourceName }) {
    if (
      mode === "activity" &&
      document.objects.length &&
      !window.confirm("Open this activity? Unsaved Whiteboard content will be replaced.")
    )
      return;
    const label = sourceName.replace(/\.[^.]+$/, "") || "Imported activity";
    const asset = await mediaRepository.saveAsset({
      blob,
      width,
      height,
      accessibilityLabel: label,
    });
    temporaryAssetIds.current.add(asset.id);
    const placement =
      mode === "activity"
        ? fitActivity(asset)
        : fitActivity(asset, { width: 420, height: 300 });
    const image = {
      id: createId(),
      kind: "image",
      assetId: asset.id,
      ...placement,
      locked: mode === "activity",
      background: mode === "activity",
      accessibilityLabel: label,
    };
    const next = {
      ...document,
      title: mode === "activity" ? `${label} — Activity` : document.title,
      objects: mode === "activity" ? [image] : [...document.objects, image],
    };
    commit(next);
    setSelectedId(mode === "activity" ? null : image.id);
    setTool(mode === "activity" ? "draw" : "select");
    setShowActivityImport(false);
    setShowStarters(false);
    setMessage(
      mode === "activity"
        ? "Activity is ready. Draw or annotate on top."
        : "Image inserted as a movable object."
    );
  }

  function setImageAsBackground() {
    if (selected?.kind !== "image" || !canEditSelected) return;
    const image = {
      ...selected,
      ...fitActivity(selected),
      locked: true,
      background: true,
    };
    const withPlacement = updateWhiteboardObject(document, selected.id, image);
    commit(setWhiteboardImageBackground(withPlacement, selected.id));
    setSelectedId(null);
  }

  function resetMarks() {
    if (document.objects.every(({ kind, background }) => kind === "image" && background))
      return;
    if (
      !window.confirm(
        "Reset marks? Annotations added over this activity will be removed."
      )
    ) {
      return;
    }
    commit(resetWhiteboardMarks(document));
    setSelectedId(null);
  }

  function useTemplate(template) {
    if (
      document.objects.length &&
      !window.confirm(
        `Start ${template.title}? Unsaved changes on this Whiteboard will be lost.`
      )
    )
      return;
    const sessionDocument = instantiateSessionCanvasTemplate(template, {
      createId,
      now: new Date().toISOString(),
    });
    setHistory(createHistory(sessionDocument));
    setSelectedId(null);
    setDraftObject(null);
    setGesture(null);
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setTool("select");
    setShowStarters(false);
    setMessage(`${template.title} is ready to use.`);
  }

  function updateSelected(changes) {
    if (!selected || !canEditSelected) return;
    commit(updateWhiteboardObject(document, selected.id, changes));
  }

  const createLocalLiveSession = useCallback(async () => {
    if (hasConfiguredLiveSessionBackend()) {
      const token = captureCognitoHostToken();
      if (!token) {
        const login = liveSessionLoginUrl();
        if (login) {
          rememberPendingLiveSessionInvite();
          window.location.assign(login);
        } else setMessage("Sign in to use Live Sessions.");
        return;
      }
      try {
        const created = await createRemoteLiveSession({
          state: projectWhiteboardForLiveSession(document, liveSettings),
          token,
        });
        const credential = await getHostRoomCredential({ sessionId: created.id, token });
        setHostLiveSession({
          ...created,
          credential,
          participantUrl: participantUrlFor(created),
          role: "host",
          sessionId: created.id,
        });
        setShowStarters(false);
        setMessage("Live Session ready. Copy the participant link.");
      } catch {
        setMessage(
          "Live Session is unavailable. You can continue using this Whiteboard locally."
        );
      }
      return;
    }
    if (!import.meta.env.DEV) {
      setMessage("Remote Live Sessions are not configured.");
      return;
    }
    const created = createLiveSession({
      activityKind: "whiteboard",
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      id: createId(),
    });
    const origin = window.location.origin;
    setHostLiveSession({
      ...created,
      participantUrl: `${origin}/join/${encodeURIComponent(created.id)}`,
      role: "host",
      sessionId: created.id,
    });
    setShowStarters(false);
    setMessage("Local Live Session ready. Open the participant link in another tab.");
  }, [createId, document, liveSettings]);

  useEffect(() => {
    createLiveSessionRef.current = createLocalLiveSession;
  }, [createLocalLiveSession]);

  useEffect(() => {
    if (
      pendingInviteHandled.current ||
      !hasConfiguredLiveSessionBackend() ||
      !captureCognitoHostToken() ||
      !consumePendingLiveSessionInvite()
    )
      return;
    pendingInviteHandled.current = true;
    void createLiveSessionRef.current?.();
  }, []);

  async function copyParticipantLink() {
    try {
      await navigator.clipboard?.writeText(hostLiveSession.participantUrl);
      setMessage("Participant link copied.");
    } catch {
      setMessage("Copy the participant link shown in the Live Session panel.");
    }
  }

  async function endLocalLiveSession() {
    if (hostLiveSession?.credential) {
      try {
        await endRemoteLiveSession({
          sessionId: hostLiveSession.sessionId,
          token: getCognitoHostToken(),
        });
      } catch {
        /* transport end remains safe locally */
      }
    }
    live.endSession();
    setHostLiveSession((current) =>
      current ? { ...current, status: "ended" } : current
    );
  }

  const selectedStyleKind = selected?.kind;
  const participantPreset = liveSettings.participantPreset;
  const participantUndoAvailable =
    participantMode && Boolean(liveSettings.participantUndoAvailable);
  const hostUndoAvailable =
    !participantMode &&
    (activeLiveSession
      ? Boolean(liveSettings.hostUndoAvailable)
      : Boolean(history.past.length));
  const canEditSelected =
    !participantMode ||
    (!selected?.locked && liveSettings.participantPermission !== "draw-only");

  function updateLiveSettings(changes) {
    if (participantMode || !activeLiveSession) return;
    const next = { ...liveSettings, ...changes };
    setLiveSettings(next);
    live.publishState(projectWhiteboardForLiveSession(document, next));
  }
  const participantSettings = (
    <>
      <label>
        Child interface
        <select
          aria-label="Child interface"
          onChange={(event) =>
            updateLiveSettings({ participantPreset: event.target.value })
          }
          value={participantPreset}
        >
          <option value="young">Young Child</option>
          <option value="older">Older Kid</option>
        </select>
      </label>
      <label>
        Child editing
        <select
          aria-label="Child editing permission"
          onChange={(event) =>
            updateLiveSettings({ participantPermission: event.target.value })
          }
          value={liveSettings.participantPermission}
        >
          <option value="everything">Everything</option>
          <option value="unlocked-items-only">Unlocked Items Only</option>
          <option value="draw-only">Draw Only</option>
        </select>
      </label>
    </>
  );
  const styleVisible =
    !participantMode &&
    (["draw", "rectangle", "ellipse", "arrow", "text"].includes(tool) || selected);

  useEffect(() => {
    function deleteSelected(event) {
      if (!selected || !canEditSelected || !["Backspace", "Delete"].includes(event.key)) {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      )
        return;
      event.preventDefault();
      commit(deleteWhiteboardObject(document, selected.id));
      setSelectedId(null);
    }
    window.addEventListener("keydown", deleteSelected);
    return () => window.removeEventListener("keydown", deleteSelected);
  });

  if (participantMode && live.status === "ended") {
    return (
      <main className="whiteboard-participant-ended">
        <h1>Session finished</h1>
        <p>This activity has ended.</p>
      </main>
    );
  }

  return (
    <main
      className={`whiteboard-page ${sessionView || participantMode ? "whiteboard-page--session-view" : ""}`}
    >
      <header className="whiteboard-header">
        {!participantMode ? (
          <div>
            <p className="eyebrow">Creative Workspace</p>
            <h1>Whiteboard</h1>
          </div>
        ) : null}
        {participantMode ? (
          live.status === "connected" ? (
            <span
              aria-label="Connected"
              className="whiteboard-live-status whiteboard-live-status--quiet"
              title="Connected"
            />
          ) : (
            <p aria-live="polite" className="whiteboard-live-status">
              {live.status === "ended" ? "Session ended" : "Reconnecting…"}
            </p>
          )
        ) : sessionView ? (
          <div className="whiteboard-session-controls">
            <span aria-live="polite">
              {live.participantState === "connected"
                ? "Child connected"
                : "Waiting for child"}
            </span>
            <details className="whiteboard-session-settings whiteboard-session-settings--compact">
              <summary>Child controls</summary>
              <div>{participantSettings}</div>
            </details>
            <button onClick={() => setSessionView(false)} type="button">
              Exit Session View
            </button>
            <button
              className="whiteboard-delete"
              onClick={endLocalLiveSession}
              type="button"
            >
              End Session
            </button>
          </div>
        ) : (
          <div className="whiteboard-document-controls">
            <label>
              Title{" "}
              <input
                aria-label="Whiteboard title"
                onChange={(event) => commit({ ...document, title: event.target.value })}
                value={document.title}
              />
            </label>
            <button onClick={() => setShowStarters(true)} type="button">
              Start With…
            </button>
            {background ? (
              <button
                onClick={() => {
                  commit(
                    updateWhiteboardObject(document, background.id, {
                      locked: !background.locked,
                    })
                  );
                  setSelectedId(background.locked ? background.id : null);
                }}
                type="button"
              >
                {background.locked ? "Unlock Background" : "Lock Background"}
              </button>
            ) : null}
            {background ? (
              <button onClick={resetMarks} type="button">
                Reset Marks
              </button>
            ) : null}
            <button onClick={() => void save()} type="button">
              <Save aria-hidden="true" size={17} /> Save
            </button>
            <button
              onClick={() => {
                void refreshSaved();
                setShowOpen(true);
              }}
              type="button"
            >
              Open
            </button>
            <button onClick={startNew} type="button">
              <RotateCcw aria-hidden="true" size={17} /> New
            </button>
          </div>
        )}
      </header>

      {!participantMode ? (
        <LiveSessionPanel
          onCopy={() => void copyParticipantLink()}
          onCreate={createLocalLiveSession}
          onEnd={endLocalLiveSession}
          onEnterSessionView={() => setSessionView(true)}
          participantState={live.participantState}
          session={hostLiveSession}
        />
      ) : null}

      {activeLiveSession && document.objects.some(({ kind }) => kind === "image") ? (
        <p className="whiteboard-live-media-warning" role="status">
          Imported local images stay on this device and are not shared in a Live Session.
        </p>
      ) : null}

      {showStarters && !activeLiveSession ? (
        <SessionCanvasStartPanel onUse={useTemplate} templates={sessionCanvasTemplates} />
      ) : null}

      {showActivityImport && !activeLiveSession ? (
        <ActivityImportPanel
          onCancel={() => setShowActivityImport(false)}
          onImport={importActivity}
        />
      ) : null}

      <section className="whiteboard-workspace">
        <WhiteboardToolbar
          canUndo={participantUndoAvailable}
          color={strokeColor}
          colors={colors}
          disabled={liveEnded}
          onColorChange={setStrokeColor}
          onPickerChange={setParticipantPicker}
          onShowStickers={() => setShowChildStickers(true)}
          onShowActivity={() => setShowActivityImport(true)}
          onShowIcons={() => setShowIcons(true)}
          onToolChange={setTool}
          onUndo={() => live.requestAction({ type: "whiteboard/undo-participant" })}
          participantMode={participantMode}
          participantPermission={liveSettings.participantPermission}
          participantPreset={participantPreset}
          picker={participantPicker}
          tool={tool}
        />
        {activeLiveSession && !participantMode && !sessionView ? (
          <aside
            aria-label="Participant session controls"
            className="whiteboard-session-settings"
          >
            {participantSettings}
          </aside>
        ) : null}
        {styleVisible ? (
          <aside aria-label="Style controls" className="whiteboard-style-panel">
            <span>{selected ? "Selected" : "Style"}</span>
            <div aria-label="Stroke colors" className="whiteboard-colors" role="group">
              {colors.map((value) => (
                <button
                  aria-label={`Use ${value}`}
                  className="whiteboard-color"
                  data-selected={
                    (selected?.strokeColor ?? selected?.color ?? strokeColor) === value ||
                    undefined
                  }
                  key={value}
                  onClick={() => {
                    setStrokeColor(value);
                    updateSelected(
                      selectedStyleKind === "text"
                        ? { color: value }
                        : { strokeColor: value }
                    );
                  }}
                  style={{ backgroundColor: value }}
                  type="button"
                />
              ))}
            </div>
            {shapeTools.has(tool) ||
            ["rectangle", "ellipse"].includes(selectedStyleKind) ? (
              <label>
                Fill{" "}
                <select
                  aria-label="Fill color"
                  onChange={(event) => {
                    setFillColor(event.target.value);
                    updateSelected({ fillColor: event.target.value });
                  }}
                  value={selected?.fillColor ?? fillColor}
                >
                  <option value="transparent">None</option>
                  {colors.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {tool !== "text" && !["text", "visual"].includes(selectedStyleKind) ? (
              <label>
                Stroke{" "}
                <input
                  aria-label="Stroke width"
                  max="20"
                  min="1"
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setStrokeWidth(value);
                    updateSelected(
                      selectedStyleKind === "stroke"
                        ? { width: value }
                        : { strokeWidth: value }
                    );
                  }}
                  type="range"
                  value={selected?.strokeWidth ?? selected?.width ?? strokeWidth}
                />
              </label>
            ) : null}
            {tool === "text" || selectedStyleKind === "text" ? (
              <label>
                Text Size{" "}
                <input
                  aria-label="Text Size"
                  max="96"
                  min="12"
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setTextSize(value);
                    updateSelected({ size: value });
                  }}
                  type="range"
                  value={selected?.size ?? textSize}
                />
              </label>
            ) : null}
            {selectedStyleKind === "visual" ? (
              <label>
                Visual Size
                <input
                  aria-label="Visual Size"
                  max="400"
                  min="32"
                  onChange={(event) => {
                    const size = Number(event.target.value);
                    updateSelected({ width: size, height: size });
                  }}
                  type="range"
                  value={selected.width}
                />
              </label>
            ) : null}
            {selectedStyleKind === "text" ? (
              <label>
                Text{" "}
                <input
                  aria-label="Selected text"
                  autoFocus
                  onChange={(event) => updateSelected({ text: event.target.value })}
                  value={selected.text}
                />
              </label>
            ) : null}
            {selectedStyleKind === "arrow" ? (
              <label>
                Arrow Label{" "}
                <input
                  aria-label="Arrow Label"
                  onChange={(event) =>
                    updateSelected({ label: event.target.value || undefined })
                  }
                  value={selected.label ?? ""}
                />
              </label>
            ) : null}
            {selectedStyleKind === "image" ? (
              <>
                <label>
                  Image Label{" "}
                  <input
                    aria-label="Image Label"
                    onChange={(event) =>
                      updateSelected({ accessibilityLabel: event.target.value })
                    }
                    value={selected.accessibilityLabel}
                  />
                </label>
                {!selected.background ? (
                  <button onClick={setImageAsBackground} type="button">
                    Set as Background
                  </button>
                ) : null}
              </>
            ) : null}
            {selected ? (
              <button
                disabled={!canEditSelected}
                onClick={() => {
                  const duplicateId = createId();
                  commit(duplicateWhiteboardObject(document, selected.id, duplicateId));
                  setSelectedId(duplicateId);
                }}
                type="button"
              >
                Duplicate
              </button>
            ) : null}
            {selected ? (
              <button
                disabled={!canEditSelected || selectedIndex <= 0}
                onClick={() =>
                  commit(moveWhiteboardObjectLayer(document, selected.id, -1))
                }
                type="button"
              >
                Backward
              </button>
            ) : null}
            {selected ? (
              <button
                disabled={
                  !canEditSelected || selectedIndex === document.objects.length - 1
                }
                onClick={() =>
                  commit(moveWhiteboardObjectLayer(document, selected.id, 1))
                }
                type="button"
              >
                Forward
              </button>
            ) : null}
            {selected ? (
              <button
                disabled={!canEditSelected}
                onClick={() => updateSelected({ locked: !selected.locked })}
                type="button"
              >
                {selected.locked ? "Unlock" : "Lock"}
              </button>
            ) : null}
            {selected ? (
              <button
                className="whiteboard-delete"
                disabled={!canEditSelected}
                onClick={() => {
                  commit(deleteWhiteboardObject(document, selected.id));
                  setSelectedId(null);
                }}
                type="button"
              >
                Delete Selected
              </button>
            ) : null}
          </aside>
        ) : null}

        {showIcons ? (
          <div className="whiteboard-icon-control">
            <IconBrowserField
              actionLabel="Choose Visual"
              label="Whiteboard Visual"
              onSave={(iconId) => {
                const visual = {
                  id: createId(),
                  kind: "visual",
                  iconId,
                  x: 420,
                  y: 270,
                  width: 160,
                  height: 160,
                };
                commit(addWhiteboardObject(document, visual));
                setSelectedId(visual.id);
                setTool("select");
                setShowIcons(false);
              }}
              value={selected?.kind === "visual" ? selected.iconId : null}
            />
          </div>
        ) : null}
        {showOpen && !participantMode ? (
          <section aria-label="Saved Whiteboards" className="whiteboard-open-panel">
            <div>
              <h2>Saved Whiteboards</h2>
              <button onClick={() => setShowOpen(false)} type="button">
                Close
              </button>
            </div>
            {savedBoards.length ? (
              savedBoards.map((board) => (
                <button
                  key={board.id}
                  onClick={() => {
                    setHistory(createHistory(board));
                    setSelectedId(null);
                    setShowOpen(false);
                    setShowStarters(false);
                  }}
                  type="button"
                >
                  {board.title}
                </button>
              ))
            ) : (
              <p>No saved Whiteboards yet.</p>
            )}
          </section>
        ) : null}
        {message ? <p role="status">{message}</p> : null}

        {participantMode && showChildStickers ? (
          <ParticipantStickerPicker
            onChoose={(iconId) => {
              const visual = {
                id: createId(),
                kind: "visual",
                iconId,
                x: 430,
                y: 280,
                width: 140,
                height: 140,
              };
              commit(addWhiteboardObject(document, visual));
              setSelectedId(visual.id);
              setTool("select");
              setShowChildStickers(false);
            }}
            onClose={() => setShowChildStickers(false)}
          />
        ) : null}

        <div className="whiteboard-canvas-frame">
          <WhiteboardCanvas
            document={document}
            draftObject={draftObject}
            onCanvasPointerDown={canvasPointerDown}
            onObjectPointerDown={objectPointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onResizePointerDown={(event, object) => {
              if (liveEnded || object.locked || (participantMode && !canEditSelected))
                return;
              event.stopPropagation();
              setGesture({ type: "resize", document, object, start: point(event) });
            }}
            onStrokeErase={(event, object) => {
              if (tool !== "erase" || object.locked) return;
            }}
            pan={pan}
            selectedId={selectedId}
            tool={tool}
            onPointerCancel={pointerCancel}
            zoom={zoom}
            mediaRepository={mediaRepository}
          />
          {!participantMode ? (
            <div
              aria-label="History and zoom controls"
              className="whiteboard-corner-controls"
            >
              <button
                aria-label="Undo"
                disabled={!hostUndoAvailable}
                onClick={() => {
                  if (activeLiveSession) {
                    live.requestAction({ type: "whiteboard/undo-host" });
                    return;
                  }
                  const next = undoHistory(history);
                  setHistory(next);
                  if (activeLiveSession)
                    live.publishState(
                      projectWhiteboardForLiveSession(next.present, liveSettings)
                    );
                  else adapterRef.current?.publish(next.present);
                }}
                type="button"
              >
                <Undo2 aria-hidden="true" size={17} />
              </button>
              <button
                aria-label="Redo"
                disabled={!history.future.length}
                onClick={() => {
                  const next = redoHistory(history);
                  setHistory(next);
                  if (activeLiveSession)
                    live.publishState(
                      projectWhiteboardForLiveSession(next.present, liveSettings)
                    );
                  else adapterRef.current?.publish(next.present);
                }}
                type="button"
              >
                <Redo2 aria-hidden="true" size={17} />
              </button>
              <button
                aria-label="Zoom out"
                onClick={() => setZoom((value) => Math.max(0.5, value - 0.1))}
                type="button"
              >
                <ZoomOut aria-hidden="true" size={17} />
              </button>
              <output aria-label="Zoom percentage">{Math.round(zoom * 100)}%</output>
              <button
                aria-label="Zoom in"
                onClick={() => setZoom((value) => Math.min(2, value + 0.1))}
                type="button"
              >
                <ZoomIn aria-hidden="true" size={17} />
              </button>
            </div>
          ) : null}
          {!participantMode ? (
            <button
              className="whiteboard-clear"
              onClick={() => {
                if (!window.confirm("Clear the entire Whiteboard?")) return;
                if (activeLiveSession) live.requestAction({ type: "whiteboard/clear" });
                else commit(clearWhiteboard(document));
              }}
              type="button"
            >
              <Trash2 aria-hidden="true" size={17} /> Clear All
            </button>
          ) : null}
        </div>
      </section>
      <p className="whiteboard-sharing-note">
        {hasConfiguredLiveSessionBackend()
          ? "Safe for screen sharing. Invite a child to collaborate in this non-PHI development session."
          : "Safe for screen sharing. Same-browser tab sharing is available."}
      </p>
    </main>
  );
}
