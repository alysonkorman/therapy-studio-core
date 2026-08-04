import IconRenderer from "./IconRenderer";

export default function IconGrid({ icons, onConfirm, onSelect, selectedId }) {
  function handleKeyDown(event) {
    const button = event.target.closest("button[data-icon-index]");
    if (!button) return;
    const index = Number(button.dataset.iconIndex);
    if (event.key === "Enter") {
      event.preventDefault();
      onConfirm(button.dataset.iconId);
      return;
    }
    const columns = Math.max(
      1,
      Math.floor(event.currentTarget.clientWidth / Math.max(button.offsetWidth, 88))
    );
    const offsets = {
      ArrowDown: columns,
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -columns,
    };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    const targetIndex = Math.min(
      icons.length - 1,
      Math.max(0, index + offsets[event.key])
    );
    event.currentTarget.querySelector(`[data-icon-index="${targetIndex}"]`)?.focus();
  }

  return (
    <div className="icon-browser__grid" onKeyDown={handleKeyDown} role="grid">
      {icons.map((icon, index) => (
        <div key={icon.id} role="gridcell">
          <button
            aria-label={`Select ${icon.label}`}
            aria-pressed={selectedId === icon.id}
            data-icon-id={icon.id}
            data-icon-index={index}
            onClick={() => onSelect(icon.id)}
            onDoubleClick={() => onConfirm(icon.id)}
            type="button"
          >
            <IconRenderer iconId={icon.id} size={42} />
            <span>{icon.label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
