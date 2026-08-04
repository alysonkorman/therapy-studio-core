import { Archive, ArrowDown, ArrowRight, ArrowUp, Copy } from "lucide-react";
import { Link } from "react-router-dom";

import { IconRenderer } from "../icons";
import { promptAccentStyle } from "./promptAppearance";
import formatPromptDisplayLabel from "./formatPromptDisplayLabel";

export default function PromptDeckCard({ deck, authoring, index, total }) {
  return (
    <article className="prompt-deck-card" style={promptAccentStyle(deck.color)}>
      <div className="prompt-deck-card__band">
        <span className="prompt-identity-icon-tile">
          <IconRenderer iconId={deck.iconId} size={38} />
        </span>
        <div className="prompt-deck-card__meta">
          <span>{formatPromptDisplayLabel(deck.category)}</span>
          <span>
            {deck.prompts.length} {deck.prompts.length === 1 ? "prompt" : "prompts"}
          </span>
        </div>
      </div>
      <div className="prompt-deck-card__body">
        <h2>{deck.title}</h2>
        {deck.description ? <p>{deck.description}</p> : null}
        <Link className="prompt-deck-card__link" to={`/prompts/${deck.id}`}>
          Open deck
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </div>
      {authoring ? (
        <div className="authoring-actions prompt-deck-card__actions">
          <button
            disabled={index === 0}
            onClick={() => authoring.move(index, -1)}
            type="button"
          >
            <ArrowUp aria-hidden="true" size={16} />
            Move up
          </button>
          <button
            disabled={index === total - 1}
            onClick={() => authoring.move(index, 1)}
            type="button"
          >
            <ArrowDown aria-hidden="true" size={16} />
            Move down
          </button>
          <button onClick={() => authoring.duplicate(deck.id)} type="button">
            <Copy aria-hidden="true" size={16} />
            Duplicate
          </button>
          <button onClick={() => authoring.toggleArchive(deck)} type="button">
            <Archive aria-hidden="true" size={16} />
            {deck.archived ? "Restore" : "Archive"}
          </button>
        </div>
      ) : null}
    </article>
  );
}
