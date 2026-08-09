import { RotateCw } from "lucide-react";
import { useRef, useState } from "react";

import WorkspaceAssetImage from "./WorkspaceAssetImage";
import {
  clampWorkspaceObjectPosition,
  constrainWorkspaceObjectSize,
  normalizeWorkspaceRotation,
} from "./workspaceDocument";

export default function WorkspaceObject({ object, selected, onChange, onSelect }) {
  const gestureRef = useRef(null);
  const objectRef = useRef(null);
  const [gestureMode, setGestureMode] = useState(null);

  function beginGesture(event, mode) {
    if (!event.isPrimary || event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    onSelect(object.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    const objectBounds = objectRef.current.getBoundingClientRect();
    const canvasBounds = objectRef.current.parentElement?.getBoundingClientRect();
    const center = {
      x: objectBounds.left + objectBounds.width / 2,
      y: objectBounds.top + objectBounds.height / 2,
    };
    gestureRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      center,
      canvasBounds,
      startDistance: Math.hypot(event.clientX - center.x, event.clientY - center.y),
      object: { ...object },
    };
    setGestureMode(mode);
  }

  function continueGesture(event) {
    const gesture = gestureRef.current;
    if (!gesture) return;
    event.stopPropagation();
    event.preventDefault();
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;

    if (gesture.mode === "move") {
      onChange(
        clampWorkspaceObjectPosition(
          gesture.object,
          { x: gesture.object.x + dx, y: gesture.object.y + dy },
          gesture.canvasBounds
        )
      );
    } else if (gesture.mode === "resize") {
      const distance = Math.hypot(
        event.clientX - gesture.center.x,
        event.clientY - gesture.center.y
      );
      const scale = gesture.startDistance > 0 ? distance / gesture.startDistance : 1;
      onChange(constrainWorkspaceObjectSize(gesture.object, scale));
    } else {
      const centerX = gesture.center.x;
      const centerY = gesture.center.y;
      const startAngle = Math.atan2(gesture.startY - centerY, gesture.startX - centerX);
      const nextAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
      onChange({
        rotation: normalizeWorkspaceRotation(
          gesture.object.rotation + ((nextAngle - startAngle) * 180) / Math.PI
        ),
      });
    }
  }

  function endGesture(event) {
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    gestureRef.current = null;
    setGestureMode(null);
  }

  return (
    <div
      aria-label={`${object.label}, workspace object`}
      aria-pressed={selected}
      className={`workspace-object ${selected ? "workspace-object--selected" : ""} ${gestureMode ? "workspace-object--gesturing" : ""}`}
      onKeyDown={(event) => {
        const movement = {
          ArrowLeft: [-10, 0],
          ArrowRight: [10, 0],
          ArrowUp: [0, -10],
          ArrowDown: [0, 10],
        }[event.key];
        if (!movement) return;
        event.preventDefault();
        const canvasBounds = objectRef.current.parentElement?.getBoundingClientRect();
        onChange(
          clampWorkspaceObjectPosition(
            object,
            { x: object.x + movement[0], y: object.y + movement[1] },
            canvasBounds
          )
        );
      }}
      onPointerDown={(event) => beginGesture(event, "move")}
      onPointerMove={continueGesture}
      onPointerCancel={endGesture}
      onLostPointerCapture={() => {
        gestureRef.current = null;
        setGestureMode(null);
      }}
      onPointerUp={endGesture}
      role="button"
      ref={objectRef}
      style={{
        background: object.color,
        height: object.height,
        transform: `rotate(${object.rotation}deg)`,
        width: object.width,
        left: object.x,
        top: object.y,
      }}
      tabIndex="0"
    >
      {object.assetKind === "icon" ? (
        <WorkspaceAssetImage
          assetId={object.assetId}
          className="workspace-object__image"
          label={object.label}
        />
      ) : (
        <span aria-hidden="true" className="workspace-object__symbol">
          {object.symbol}
        </span>
      )}
      {selected ? (
        <>
          <button
            aria-label={`Rotate ${object.label}`}
            className="workspace-object__handle workspace-object__handle--rotate"
            onPointerDown={(event) => beginGesture(event, "rotate")}
            onPointerMove={continueGesture}
            onPointerCancel={endGesture}
            onPointerUp={endGesture}
            type="button"
          >
            <RotateCw aria-hidden="true" size={19} />
          </button>
          <button
            aria-label={`Resize ${object.label}`}
            className="workspace-object__handle workspace-object__handle--resize"
            onPointerDown={(event) => beginGesture(event, "resize")}
            onPointerMove={continueGesture}
            onPointerCancel={endGesture}
            onPointerUp={endGesture}
            type="button"
          />
        </>
      ) : null}
    </div>
  );
}
