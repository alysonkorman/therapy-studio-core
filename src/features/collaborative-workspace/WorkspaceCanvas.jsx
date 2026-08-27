import { useRef, useState } from "react";

import WorkspaceObject from "./WorkspaceObject";

export default function WorkspaceCanvas({
  canMoveBackward,
  canMoveForward,
  document,
  onChangeObject,
  onDraw,
  onSelect,
  onSelectedAction,
  selectedId,
  tool = "select",
}) {
  const background = document.background === "meadow" ? "outdoors" : document.background;
  const canvasRef = useRef(null);
  const [draft, setDraft] = useState([]);

  function point(event) {
    const bounds = canvasRef.current.getBoundingClientRect();
    return [event.clientX - bounds.left, event.clientY - bounds.top];
  }

  return (
    <div
      aria-label="Scene canvas"
      className={`workspace-canvas workspace-canvas--${background}`}
      ref={canvasRef}
      onPointerDown={(event) => {
        if (event.target.closest(".workspace-object")) return;
        if (tool === "draw") {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDraft([point(event)]);
        } else onSelect(null);
      }}
      onPointerMove={(event) => {
        if (tool === "draw" && draft.length)
          setDraft((points) => [...points, point(event)]);
      }}
      onPointerUp={(event) => {
        if (tool === "draw" && draft.length > 1) onDraw(draft);
        setDraft([]);
      }}
    >
      <div aria-hidden="true" className="workspace-scene">
        <div className="workspace-scene__wall" />
        <div className="workspace-scene__window" />
        <div className="workspace-scene__rug" />
        <div className="workspace-scene__sun" />
        <div className="workspace-scene__hill workspace-scene__hill--back" />
        <div className="workspace-scene__hill workspace-scene__hill--front" />
        <div className="workspace-scene__sand-lines" />
      </div>
      {document.objects.length === 0 ? (
        <div className="workspace-canvas__welcome">
          <span aria-hidden="true">✨</span>
          <strong>Tell a story here</strong>
          <p>Choose a scene piece to begin.</p>
        </div>
      ) : null}
      {document.objects.map((object) => (
        <WorkspaceObject
          key={object.id}
          object={object}
          objectControls={
            selectedId === object.id
              ? {
                  canMoveBackward,
                  canMoveForward,
                  onAction: onSelectedAction,
                }
              : null
          }
          onChange={(changes) => onChangeObject(object.id, changes)}
          onSelect={onSelect}
          selected={selectedId === object.id}
        />
      ))}
      {draft.length > 1 ? (
        <svg aria-hidden="true" className="workspace-drawing-preview">
          <polyline points={draft.map((point) => point.join(",")).join(" ")} />
        </svg>
      ) : null}
    </div>
  );
}
