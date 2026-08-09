import {
  ArrowDown,
  ArrowUp,
  Copy,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  Trash2,
} from "lucide-react";

export default function ObjectControls({
  canMoveBackward,
  canMoveForward,
  object,
  onAction,
}) {
  return (
    <div
      className="workspace-object-controls"
      aria-label={`Controls for ${object.label}`}
    >
      <strong>{object.label}</strong>
      <span className="workspace-control-hint">
        Drag the picture or use its large handles.
      </span>
      <button onClick={() => onAction("smaller")} type="button">
        <Minus aria-hidden="true" size={18} /> Smaller
      </button>
      <button onClick={() => onAction("bigger")} type="button">
        <Plus aria-hidden="true" size={18} /> Bigger
      </button>
      <button onClick={() => onAction("rotate")} type="button">
        <RotateCw aria-hidden="true" size={18} /> Turn
      </button>
      <button
        disabled={!canMoveForward}
        onClick={() => onAction("forward")}
        type="button"
      >
        <ArrowUp aria-hidden="true" size={18} /> Forward
      </button>
      <button
        disabled={!canMoveBackward}
        onClick={() => onAction("backward")}
        type="button"
      >
        <ArrowDown aria-hidden="true" size={18} /> Backward
      </button>
      <button onClick={() => onAction("duplicate")} type="button">
        <Copy aria-hidden="true" size={18} /> Duplicate
      </button>
      <button onClick={() => onAction("reset-rotation")} type="button">
        <RotateCcw aria-hidden="true" size={18} /> Straighten
      </button>
      <button
        className="workspace-delete"
        onClick={() => onAction("delete")}
        type="button"
      >
        <Trash2 aria-hidden="true" size={18} /> Remove
      </button>
    </div>
  );
}
