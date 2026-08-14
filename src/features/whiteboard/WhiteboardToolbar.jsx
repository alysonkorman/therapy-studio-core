import {
  ArrowRight,
  Brush,
  Circle,
  Eraser,
  Hand,
  ImagePlus,
  FileImage,
  MousePointer2,
  Redo2,
  Square,
  Type,
  Undo2,
} from "lucide-react";

const tools = [
  ["pan", "Pan", Hand],
  ["select", "Select", MousePointer2],
  ["rectangle", "Rectangle", Square],
  ["ellipse", "Circle", Circle],
  ["arrow", "Arrow", ArrowRight],
  ["draw", "Draw", Brush],
  ["text", "Text", Type],
  ["visual", "Add Visual", ImagePlus],
  ["activity", "Add Activity", FileImage],
  ["erase", "Eraser", Eraser],
];

export default function WhiteboardToolbar({
  disabled = false,
  onShowActivity,
  onShowIcons,
  onToolChange,
  onRedo,
  onUndo,
  participantMode = false,
  participantPreset = "young",
  participantPermission = "everything",
  canRedo = false,
  canUndo = false,
  tool,
}) {
  const youngTools = new Set(["draw", "erase", "select", "rectangle", "ellipse"]);
  const availableTools = participantMode
    ? tools.filter(([value]) =>
        participantPermission === "draw-only"
          ? value === "draw"
          : participantPreset === "young"
            ? youngTools.has(value)
            : value !== "activity" && value !== "pan" && value !== "visual"
      )
    : tools;
  return (
    <div aria-label="Whiteboard tools" className="whiteboard-toolbar" role="toolbar">
      {availableTools.map(([value, label, Icon]) => {
        const displayLabel =
          participantMode && participantPreset === "young" && value === "select"
            ? "Move"
            : label;
        return (
          <button
            aria-label={displayLabel}
            aria-pressed={tool === value}
            disabled={disabled}
            key={value}
            onClick={() => {
              if (value === "visual") onShowIcons();
              else if (value === "activity") onShowActivity();
              else onToolChange(value);
            }}
            title={displayLabel}
            type="button"
          >
            <Icon aria-hidden="true" size={19} />
            <span>{displayLabel}</span>
          </button>
        );
      })}
      {participantMode ? (
        <>
          <button
            aria-label="Undo"
            disabled={disabled || !canUndo}
            onClick={onUndo}
            type="button"
          >
            <Undo2 aria-hidden="true" size={19} />
            <span>Undo</span>
          </button>
          {participantPreset === "older" ? (
            <button
              aria-label="Redo"
              disabled={disabled || !canRedo}
              onClick={onRedo}
              type="button"
            >
              <Redo2 aria-hidden="true" size={19} />
              <span>Redo</span>
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
