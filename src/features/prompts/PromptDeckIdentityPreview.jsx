import { IconRenderer } from "../icons";
import { promptAccentStyle } from "./promptAppearance";

export default function PromptDeckIdentityPreview({ category, color, iconId, title }) {
  return (
    <article
      aria-label="Live deck appearance preview"
      className="prompt-deck-identity-preview"
      style={promptAccentStyle(color)}
    >
      <div className="prompt-deck-identity-preview__band">
        <span className="prompt-identity-icon-tile">
          <IconRenderer iconId={iconId} size={42} />
        </span>
        <span className="prompt-deck-identity-preview__label">Preview</span>
      </div>
      <div className="prompt-deck-identity-preview__copy">
        <strong>{title}</strong>
        {category ? <span>{category}</span> : null}
      </div>
    </article>
  );
}
