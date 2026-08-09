import { Image } from "lucide-react";

export default function BackgroundChooser({ backgrounds, onChange, value }) {
  return (
    <div className="workspace-backgrounds" aria-label="Choose a background">
      <span className="workspace-backgrounds__label">
        <Image aria-hidden="true" size={18} /> Background
      </span>
      <div className="workspace-backgrounds__options">
        {backgrounds.map((background) => (
          <button
            aria-pressed={value === background.id}
            className={`workspace-background-choice workspace-background-choice--${background.id}`}
            key={background.id}
            onClick={() => onChange(background.id)}
            type="button"
          >
            <span aria-hidden="true">{background.symbol}</span>
            {background.label}
          </button>
        ))}
      </div>
    </div>
  );
}
