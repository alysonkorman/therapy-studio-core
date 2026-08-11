import {
  Brush,
  Eraser,
  FolderOpen,
  MousePointer2,
  Redo2,
  RotateCcw,
  Save,
  Shapes,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";

export default function WhiteboardToolbar({
  canRedo,
  canUndo,
  color,
  colors,
  onClear,
  onColorChange,
  onNew,
  onOpen,
  onRedo,
  onSave,
  onShowIcons,
  onStrokeWidthChange,
  onTitleChange,
  onToolChange,
  onUndo,
  strokeWidth,
  title,
  tool,
}) {
  return (
    <>
      <div aria-label="Whiteboard toolbar" className="whiteboard-toolbar" role="toolbar">
        {[
          ["draw", "Draw", Brush],
          ["erase", "Erase", Eraser],
          ["text", "Text", Type],
          ["select", "Select", MousePointer2],
        ].map(([value, label, Icon]) => (
          <button
            aria-pressed={tool === value}
            key={value}
            onClick={() => onToolChange(value)}
            type="button"
          >
            <Icon aria-hidden="true" size={18} /> {label}
          </button>
        ))}
        <button onClick={onShowIcons} type="button">
          <Shapes aria-hidden="true" size={18} /> Add SVG
        </button>
        <button disabled={!canUndo} onClick={onUndo} type="button">
          <Undo2 aria-hidden="true" size={18} /> Undo
        </button>
        <button disabled={!canRedo} onClick={onRedo} type="button">
          <Redo2 aria-hidden="true" size={18} /> Redo
        </button>
        <button onClick={onClear} type="button">
          <Trash2 aria-hidden="true" size={18} /> Clear
        </button>
        <button onClick={onSave} type="button">
          <Save aria-hidden="true" size={18} /> Save
        </button>
        <button onClick={onOpen} type="button">
          <FolderOpen aria-hidden="true" size={18} /> Open
        </button>
        <button onClick={onNew} type="button">
          <RotateCcw aria-hidden="true" size={18} /> New
        </button>
      </div>
      <div className="whiteboard-options">
        <label>
          Color{" "}
          <input
            aria-label="Whiteboard color"
            onChange={(event) => onColorChange(event.target.value)}
            type="color"
            value={color}
          />
        </label>
        <div aria-label="Preset colors" className="whiteboard-colors" role="group">
          {colors.map((value) => (
            <button
              aria-label={`Use ${value}`}
              className="whiteboard-color"
              data-selected={color === value || undefined}
              key={value}
              onClick={() => onColorChange(value)}
              style={{ backgroundColor: value }}
              type="button"
            />
          ))}
        </div>
        <label>
          Stroke Size{" "}
          <input
            aria-label="Stroke Size"
            max="20"
            min="1"
            onChange={(event) => onStrokeWidthChange(Number(event.target.value))}
            type="range"
            value={strokeWidth}
          />
        </label>
        <label>
          Title{" "}
          <input
            aria-label="Whiteboard title"
            onChange={(event) => onTitleChange(event.target.value)}
            value={title}
          />
        </label>
      </div>
    </>
  );
}
