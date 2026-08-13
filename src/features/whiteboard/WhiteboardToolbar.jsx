import {
  ArrowRight,
  Brush,
  Circle,
  Eraser,
  Hand,
  ImagePlus,
  FileImage,
  MousePointer2,
  Square,
  Type,
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
  participantMode = false,
  tool,
}) {
  const availableTools = participantMode
    ? tools.filter(([value]) => value !== "activity" && value !== "pan")
    : tools;
  return (
    <div aria-label="Whiteboard tools" className="whiteboard-toolbar" role="toolbar">
      {availableTools.map(([value, label, Icon]) => (
        <button
          aria-label={label}
          aria-pressed={tool === value}
          disabled={disabled}
          key={value}
          onClick={() => {
            if (value === "visual") onShowIcons();
            else if (value === "activity") onShowActivity();
            else onToolChange(value);
          }}
          title={label}
          type="button"
        >
          <Icon aria-hidden="true" size={19} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
