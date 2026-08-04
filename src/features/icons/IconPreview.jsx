import IconRenderer from "./IconRenderer";

export default function IconPreview({ icon, onClear, onConfirm }) {
  return (
    <aside className="icon-browser__preview">
      <p>Current Selection</p>
      <span className="icon-browser__preview-image">
        <IconRenderer iconId={icon.id} size={72} />
      </span>
      <strong>{icon.label}</strong>
      <span>{icon.group}</span>
      <button className="button-primary" onClick={onConfirm} type="button">
        Select Icon
      </button>
      <button onClick={onClear} type="button">
        Clear Icon
      </button>
    </aside>
  );
}
