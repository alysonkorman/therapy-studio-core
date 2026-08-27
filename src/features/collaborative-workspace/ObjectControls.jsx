import {
  ArrowDown,
  ArrowUp,
  Copy,
  FlipHorizontal,
  Lock,
  LockOpen,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function ObjectControls({
  canMoveBackward,
  canMoveForward,
  object,
  onAction,
}) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const triggerRef = useRef(null);

  function toggleMenu() {
    if (menuPosition) {
      setConfirmingRemove(false);
      setMenuPosition(null);
      return;
    }

    const triggerBounds = triggerRef.current.getBoundingClientRect();
    const menuWidth = 224;
    const menuHeight = 360;
    const gap = 10;
    const edge = 12;
    const hasRoomOnRight =
      triggerBounds.right + gap + menuWidth <= window.innerWidth - edge;
    const left = hasRoomOnRight
      ? triggerBounds.right + gap
      : Math.max(edge, triggerBounds.left - menuWidth - gap);
    const top = Math.min(
      Math.max(edge, triggerBounds.top),
      Math.max(edge, window.innerHeight - menuHeight - edge)
    );
    setMenuPosition({ left, top });
  }

  function runAction(action) {
    onAction(action);
    setConfirmingRemove(false);
    setMenuPosition(null);
  }

  return (
    <>
      <button
        aria-expanded={Boolean(menuPosition)}
        aria-haspopup="menu"
        aria-label={`More actions for ${object.label}`}
        className="workspace-object-menu-trigger"
        onClick={toggleMenu}
        onPointerDown={(event) => event.stopPropagation()}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true">•••</span>
      </button>
      {menuPosition
        ? createPortal(
            <div
              aria-label={`Actions for ${object.label}`}
              className="workspace-object-menu"
              onPointerDown={(event) => event.stopPropagation()}
              role="menu"
              style={menuPosition}
            >
              <strong>{object.label}</strong>
              <div className="workspace-object-menu__quick" aria-label="Size and turn">
                <button
                  onClick={() => runAction("smaller")}
                  role="menuitem"
                  type="button"
                >
                  <Minus aria-hidden="true" size={18} /> Smaller
                </button>
                <button onClick={() => runAction("bigger")} role="menuitem" type="button">
                  <Plus aria-hidden="true" size={18} /> Bigger
                </button>
                <button onClick={() => runAction("rotate")} role="menuitem" type="button">
                  <RotateCw aria-hidden="true" size={18} /> Turn
                </button>
              </div>
              <button
                onClick={() => runAction("duplicate")}
                role="menuitem"
                type="button"
              >
                <Copy aria-hidden="true" size={18} /> Make a Copy
              </button>
              <button onClick={() => runAction("flip")} role="menuitem" type="button">
                <FlipHorizontal aria-hidden="true" size={18} /> Flip
              </button>
              <button onClick={() => runAction("lock")} role="menuitem" type="button">
                {object.locked ? (
                  <LockOpen aria-hidden="true" size={18} />
                ) : (
                  <Lock aria-hidden="true" size={18} />
                )}
                {object.locked ? "Unlock" : "Lock"}
              </button>
              <button
                disabled={!canMoveForward}
                onClick={() => runAction("forward")}
                role="menuitem"
                type="button"
              >
                <ArrowUp aria-hidden="true" size={18} /> Bring Forward
              </button>
              <button
                disabled={!canMoveBackward}
                onClick={() => runAction("backward")}
                role="menuitem"
                type="button"
              >
                <ArrowDown aria-hidden="true" size={18} /> Send Back
              </button>
              <button
                onClick={() => runAction("reset-rotation")}
                role="menuitem"
                type="button"
              >
                <RotateCcw aria-hidden="true" size={18} /> Straighten
              </button>
              <button
                aria-live="polite"
                className={`workspace-delete ${confirmingRemove ? "workspace-delete--confirming" : ""}`}
                onClick={() => {
                  if (confirmingRemove) runAction("delete");
                  else setConfirmingRemove(true);
                }}
                role="menuitem"
                type="button"
              >
                <Trash2 aria-hidden="true" size={18} />
                {confirmingRemove ? "Tap Again to Remove" : "Remove"}
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
