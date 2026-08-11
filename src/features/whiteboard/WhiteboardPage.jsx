import { nanoid } from "nanoid";
import { useEffect, useMemo, useRef, useState } from "react";

import { Page } from "../../components/layout";
import {
  addWhiteboardObject,
  clearWhiteboard,
  commitHistory,
  createHistory,
  deleteWhiteboardObject,
  redoHistory,
  undoHistory,
  updateWhiteboardObject,
} from "../../engines/whiteboard/whiteboardOperations";
import { whiteboardRepository } from "../../lib/data";
import { createBlankWhiteboardDocument, whiteboardDocumentSchema } from "../../models";
import { IconBrowserField } from "../icons";
import WhiteboardCanvas from "./WhiteboardCanvas";
import { createWhiteboardCollaborationAdapter } from "./whiteboardCollaborationAdapter";
import WhiteboardToolbar from "./WhiteboardToolbar";
import "./WhiteboardPage.css";

const whiteboardColors = ["#28252C", "#67529D", "#2F766D", "#B14C4C", "#D17A22"];

function blank(createId) {
  return createBlankWhiteboardDocument({
    id: createId(),
    now: new Date().toISOString(),
  });
}

export default function WhiteboardPage({
  collaborationFactory = createWhiteboardCollaborationAdapter,
  createId = () => nanoid(),
  repository = whiteboardRepository,
}) {
  const [history, setHistory] = useState(() => createHistory(blank(createId)));
  const [tool, setTool] = useState("draw");
  const [color, setColor] = useState(whiteboardColors[0]);
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [draftStroke, setDraftStroke] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [drag, setDrag] = useState(null);
  const [savedBoards, setSavedBoards] = useState([]);
  const [showOpen, setShowOpen] = useState(false);
  const [showIcons, setShowIcons] = useState(false);
  const [message, setMessage] = useState("");
  const adapterRef = useRef(null);
  const participantId = useRef(createId());
  const document = history.present;
  const selected = useMemo(
    () => document.objects.find(({ id }) => id === selectedId),
    [document.objects, selectedId]
  );

  useEffect(() => {
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
  }, [collaborationFactory, document.id]);

  function commit(next) {
    setHistory((current) => commitHistory(current, next));
    adapterRef.current?.publish(next);
  }

  function point(event) {
    const surface = event.currentTarget.ownerSVGElement ?? event.currentTarget;
    const bounds = surface.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / (bounds.width || 1000)) * 1000,
      y: ((event.clientY - bounds.top) / (bounds.height || 700)) * 700,
    };
  }

  function canvasPointerDown(event) {
    const location = point(event);
    if (tool === "draw") {
      setDraftStroke({
        id: createId(),
        kind: "stroke",
        points: [location],
        color,
        width: strokeWidth,
      });
    } else if (tool === "text") {
      const object = {
        id: createId(),
        kind: "text",
        text: "Text",
        ...location,
        color,
        size: 32,
      };
      commit(addWhiteboardObject(document, object));
      setSelectedId(object.id);
      setTool("select");
    } else if (tool === "select") {
      setSelectedId(null);
    }
  }

  function pointerMove(event) {
    const location = point(event);
    if (draftStroke) {
      setDraftStroke((current) => ({
        ...current,
        points: [...current.points, location],
      }));
    } else if (drag) {
      setHistory((current) => ({
        ...current,
        present: updateWhiteboardObject(drag.document, drag.object.id, {
          x: drag.object.x + location.x - drag.start.x,
          y: drag.object.y + location.y - drag.start.y,
        }),
      }));
    }
  }

  function pointerUp() {
    if (draftStroke) {
      if (draftStroke.points.length > 1)
        commit(addWhiteboardObject(document, draftStroke));
      setDraftStroke(null);
    }
    if (drag) {
      setHistory((current) => ({
        past: [...current.past, drag.document],
        present: current.present,
        future: [],
      }));
      adapterRef.current?.publish(document);
      setDrag(null);
    }
  }

  function objectPointerDown(event, object) {
    if (tool !== "select") return;
    event.stopPropagation();
    setSelectedId(object.id);
    setDrag({ document, object, start: point(event) });
  }

  function eraseStroke(event, objectId) {
    if (tool !== "erase") return;
    event.stopPropagation();
    commit(deleteWhiteboardObject(document, objectId));
  }

  async function refreshSaved() {
    setSavedBoards(await repository.listWhiteboards());
  }

  async function save() {
    const saved = await repository.saveWhiteboard(document);
    setHistory(createHistory(saved));
    setMessage("Whiteboard saved locally.");
  }

  function undo() {
    const next = undoHistory(history);
    setHistory(next);
    adapterRef.current?.publish(next.present);
  }

  function redo() {
    const next = redoHistory(history);
    setHistory(next);
    adapterRef.current?.publish(next.present);
  }

  function startNew() {
    if (
      document.objects.length &&
      !window.confirm("Start a new Whiteboard? Unsaved changes will be lost.")
    )
      return;
    setHistory(createHistory(blank(createId)));
    setSelectedId(null);
    setMessage("");
  }

  return (
    <Page
      className="whiteboard-page"
      description="Draw, write, and add visuals in a child-safe shared workspace."
      title="Whiteboard"
    >
      <WhiteboardToolbar
        canRedo={Boolean(history.future.length)}
        canUndo={Boolean(history.past.length)}
        color={color}
        colors={whiteboardColors}
        onClear={() => {
          if (window.confirm("Clear the entire Whiteboard?"))
            commit(clearWhiteboard(document));
        }}
        onColorChange={setColor}
        onNew={startNew}
        onOpen={() => {
          void refreshSaved();
          setShowOpen(true);
        }}
        onRedo={redo}
        onSave={() => void save()}
        onShowIcons={() => setShowIcons((open) => !open)}
        onStrokeWidthChange={setStrokeWidth}
        onTitleChange={(title) => commit({ ...document, title })}
        onToolChange={setTool}
        onUndo={undo}
        strokeWidth={strokeWidth}
        title={document.title}
        tool={tool}
      />

      {showIcons ? (
        <div className="whiteboard-icon-control">
          <IconBrowserField
            actionLabel="Choose SVG"
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

      {selected ? (
        <aside aria-label="Selected object controls" className="whiteboard-selection">
          {selected.kind === "text" ? (
            <>
              <label>
                Text{" "}
                <input
                  aria-label="Selected text"
                  onChange={(event) =>
                    commit(
                      updateWhiteboardObject(document, selected.id, {
                        text: event.target.value,
                      })
                    )
                  }
                  value={selected.text}
                />
              </label>
              <label>
                Text Size{" "}
                <input
                  aria-label="Text Size"
                  max="96"
                  min="12"
                  onChange={(event) =>
                    commit(
                      updateWhiteboardObject(document, selected.id, {
                        size: Number(event.target.value),
                      })
                    )
                  }
                  type="range"
                  value={selected.size}
                />
              </label>
            </>
          ) : null}
          {selected.kind === "visual" ? (
            <label>
              Visual Size{" "}
              <input
                aria-label="Visual Size"
                max="400"
                min="32"
                onChange={(event) => {
                  const size = Number(event.target.value);
                  commit(
                    updateWhiteboardObject(document, selected.id, {
                      width: size,
                      height: size,
                    })
                  );
                }}
                type="range"
                value={selected.width}
              />
            </label>
          ) : null}
          <button
            onClick={() => {
              commit(deleteWhiteboardObject(document, selected.id));
              setSelectedId(null);
            }}
            type="button"
          >
            Delete Selected
          </button>
        </aside>
      ) : null}

      {showOpen ? (
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
      <WhiteboardCanvas
        document={document}
        draftStroke={draftStroke}
        onCanvasPointerDown={canvasPointerDown}
        onObjectPointerDown={objectPointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onStrokeErase={eraseStroke}
        selectedId={selectedId}
        tool={tool}
      />
      <p className="whiteboard-sharing-note">
        Same-browser tab sharing is available. Internet collaboration is not enabled.
      </p>
    </Page>
  );
}
