import {
  ArrowRight,
  Brush,
  Circle,
  Eraser,
  FileImage,
  Hand,
  ImagePlus,
  MousePointer2,
  Palette,
  Square,
  Type,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const therapistTools = [
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

const childTools = [
  ["draw", "Draw", Brush],
  ["erase", "Erase", Eraser],
  ["select", "Move", MousePointer2],
];

export default function WhiteboardToolbar({
  color = "#28252C",
  colors = [],
  canUndo = false,
  disabled = false,
  onColorChange,
  onShowStickers,
  onShowActivity,
  onShowIcons,
  onToolChange,
  participantMode = false,
  participantPreset = "young",
  participantPermission = "everything",
  picker: controlledPicker,
  tool,
  onPickerChange,
  onUndo,
}) {
  const [uncontrolledPicker, setUncontrolledPicker] = useState(null);
  const toolbarRef = useRef(null);
  const picker = controlledPicker ?? uncontrolledPicker;
  const allowObjects = participantPermission !== "draw-only";
  const visibleChildTools = allowObjects ? childTools : childTools.slice(0, 1);
  const showOlderTools = participantMode && participantPreset === "older" && allowObjects;

  const setPicker = useCallback(
    (next) => {
      if (onPickerChange) onPickerChange(next);
      else setUncontrolledPicker(next);
    },
    [onPickerChange]
  );

  useEffect(() => {
    if (!participantMode || !picker) return undefined;

    function closePickerOnOutsidePointer(event) {
      if (!toolbarRef.current?.contains(event.target)) setPicker(null);
    }

    document.addEventListener("pointerdown", closePickerOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closePickerOnOutsidePointer);
  }, [participantMode, picker, setPicker]);

  function chooseTool(value) {
    onToolChange(value);
    setPicker(null);
  }

  if (participantMode) {
    return (
      <div
        aria-label="Drawing tools"
        className="whiteboard-toolbar whiteboard-toolbar--participant"
        ref={toolbarRef}
        role="toolbar"
      >
        <div className="whiteboard-toolbar__main">
          {visibleChildTools.map(([value, label, Icon]) => (
            <button
              aria-label={label}
              aria-pressed={tool === value}
              disabled={disabled}
              key={value}
              onClick={() => chooseTool(value)}
              type="button"
            >
              <Icon aria-hidden="true" size={24} />
              <span>{label}</span>
            </button>
          ))}
          {allowObjects ? (
            <button
              aria-expanded={picker === "shapes"}
              aria-label="Shapes"
              aria-pressed={["rectangle", "ellipse"].includes(tool)}
              disabled={disabled}
              onClick={() => setPicker(picker === "shapes" ? null : "shapes")}
              type="button"
            >
              <Square aria-hidden="true" size={24} />
              <span>Shape</span>
            </button>
          ) : null}
          {allowObjects ? (
            <button
              aria-label="Stickers"
              disabled={disabled}
              onClick={() => {
                setPicker(null);
                onShowStickers();
              }}
              type="button"
            >
              <ImagePlus aria-hidden="true" size={24} />
              <span>Sticker</span>
            </button>
          ) : null}
          {showOlderTools ? (
            <>
              <button
                aria-label="Text"
                aria-pressed={tool === "text"}
                disabled={disabled}
                onClick={() => chooseTool("text")}
                type="button"
              >
                <Type aria-hidden="true" size={24} />
                <span>Text</span>
              </button>
              <button
                aria-label="Arrow"
                aria-pressed={tool === "arrow"}
                disabled={disabled}
                onClick={() => chooseTool("arrow")}
                type="button"
              >
                <ArrowRight aria-hidden="true" size={24} />
                <span>Arrow</span>
              </button>
            </>
          ) : null}
          <button
            aria-expanded={picker === "colors"}
            aria-label="Colors"
            className="whiteboard-toolbar__color-button"
            disabled={disabled}
            onClick={() => setPicker(picker === "colors" ? null : "colors")}
            type="button"
          >
            <Palette aria-hidden="true" size={24} />
            <span>Color</span>
            <i aria-hidden="true" style={{ backgroundColor: color }} />
          </button>
          <button
            aria-label="Undo"
            disabled={disabled || !canUndo}
            onClick={onUndo}
            type="button"
          >
            <Undo2 aria-hidden="true" size={24} />
            <span>Undo</span>
          </button>
        </div>
        {picker === "colors" ? (
          <div
            aria-label="Choose a color"
            className="whiteboard-child-picker"
            onPointerDown={(event) => event.stopPropagation()}
            role="group"
          >
            {colors.map((value) => (
              <button
                aria-label={`Use color ${value}`}
                aria-pressed={color === value}
                className="whiteboard-child-swatch"
                key={value}
                onClick={() => {
                  onColorChange(value);
                  setPicker(null);
                }}
                onPointerDown={(event) => event.stopPropagation()}
                style={{ backgroundColor: value }}
                type="button"
              />
            ))}
          </div>
        ) : null}
        {picker === "shapes" ? (
          <div
            aria-label="Choose a shape"
            className="whiteboard-child-picker"
            role="group"
          >
            <button
              aria-label="Square"
              onClick={() => chooseTool("rectangle")}
              type="button"
            >
              <Square aria-hidden="true" size={30} />
              <span>Square</span>
            </button>
            <button
              aria-label="Circle"
              onClick={() => chooseTool("ellipse")}
              type="button"
            >
              <Circle aria-hidden="true" size={30} />
              <span>Circle</span>
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div aria-label="Whiteboard tools" className="whiteboard-toolbar" role="toolbar">
      {therapistTools.map(([value, label, Icon]) => (
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
