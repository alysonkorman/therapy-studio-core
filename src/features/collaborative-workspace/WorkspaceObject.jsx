import { RotateCw } from "lucide-react";
import { useRef } from "react";

import WorkspaceAssetImage from "./WorkspaceAssetImage";

const MIN_SIZE = 72;

export default function WorkspaceObject({ object, selected, onChange, onSelect }) {
  const gestureRef = useRef(null);
  const objectRef = useRef(null);

  function beginGesture(event, mode) {
    event.stopPropagation();
    event.preventDefault();
    onSelect(object.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      center:
        mode === "rotate"
          ? (() => {
              const bounds = objectRef.current.getBoundingClientRect();
              return {
                x: bounds.left + bounds.width / 2,
                y: bounds.top + bounds.height / 2,
              };
            })()
          : null,
      object: { ...object },
    };
  }

  function continueGesture(event) {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;

    if (gesture.mode === "move") {
      onChange({
        x: Math.max(0, gesture.object.x + dx),
        y: Math.max(0, gesture.object.y + dy),
      });
    } else if (gesture.mode === "resize") {
      const scaleChange = Math.max(dx / gesture.object.width, dy / gesture.object.height);
      const minimumScale =
        MIN_SIZE / Math.min(gesture.object.width, gesture.object.height);
      const scale = Math.max(minimumScale, 1 + scaleChange);
      onChange({
        width: gesture.object.width * scale,
        height: gesture.object.height * scale,
      });
    } else {
      const centerX = gesture.center.x;
      const centerY = gesture.center.y;
      const startAngle = Math.atan2(gesture.startY - centerY, gesture.startX - centerX);
      const nextAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
      onChange({
        rotation: gesture.object.rotation + ((nextAngle - startAngle) * 180) / Math.PI,
      });
    }
  }

  function endGesture(event) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    gestureRef.current = null;
  }

  return (
    <div
      aria-label={`${object.label}, workspace object`}
      aria-pressed={selected}
      className={`workspace-object ${selected ? "workspace-object--selected" : ""}`}
      onKeyDown={(event) => {
        const movement = {
          ArrowLeft: [-10, 0],
          ArrowRight: [10, 0],
          ArrowUp: [0, -10],
          ArrowDown: [0, 10],
        }[event.key];
        if (!movement) return;
        event.preventDefault();
        onChange({
          x: Math.max(0, object.x + movement[0]),
          y: Math.max(0, object.y + movement[1]),
        });
      }}
      onPointerDown={(event) => beginGesture(event, "move")}
      onPointerMove={continueGesture}
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
            onPointerUp={endGesture}
            type="button"
          />
        </>
      ) : null}
    </div>
  );
}
