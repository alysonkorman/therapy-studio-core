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
import { useState } from "react";

export default function ObjectControls({
  canMoveBackward,
  canMoveForward,
  object,
  onAction,
}) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  return (
    <div
      className="workspace-object-controls"
      aria-label={`Controls for ${object.label}`}
    >
      <strong className="workspace-object-controls__name">{object.label}</strong>
      <div className="workspace-object-controls__group" aria-label="Size and turn">
        <button onClick={() => onAction("smaller")} type="button">
          <Minus aria-hidden="true" size={18} /> Smaller
        </button>
        <button onClick={() => onAction("bigger")} type="button">
          <Plus aria-hidden="true" size={18} /> Bigger
        </button>
        <button onClick={() => onAction("rotate")} type="button">
          <RotateCw aria-hidden="true" size={18} /> Turn
        </button>
        <button onClick={() => onAction("reset-rotation")} type="button">
          <RotateCcw aria-hidden="true" size={18} /> Straighten
        </button>
      </div>
      <div className="workspace-object-controls__group" aria-label="Arrange">
        <button
          disabled={!canMoveForward}
          onClick={() => onAction("forward")}
          type="button"
        >
          <ArrowUp aria-hidden="true" size={18} /> Bring Forward
        </button>
        <button
          disabled={!canMoveBackward}
          onClick={() => onAction("backward")}
          type="button"
        >
          <ArrowDown aria-hidden="true" size={18} /> Send Back
        </button>
      </div>
      <button onClick={() => onAction("duplicate")} type="button">
        <Copy aria-hidden="true" size={18} /> Make a Copy
      </button>
      <button
        aria-live="polite"
        className={`workspace-delete ${confirmingRemove ? "workspace-delete--confirming" : ""}`}
        onBlur={() => setConfirmingRemove(false)}
        onClick={() => {
          if (confirmingRemove) onAction("delete");
          else setConfirmingRemove(true);
        }}
        type="button"
      >
        <Trash2 aria-hidden="true" size={18} />
        {confirmingRemove ? "Tap Again to Remove" : "Remove"}
      </button>
    </div>
  );
}
