import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function PromptDeckCard({ deck }) {
  return (
    <article className="prompt-deck-card">
      <div className="prompt-deck-card__meta">
        <span>{deck.category}</span>
        <span>
          {deck.prompts.length} {deck.prompts.length === 1 ? "prompt" : "prompts"}
        </span>
      </div>
      <h2>{deck.title}</h2>
      {deck.description ? <p>{deck.description}</p> : null}
      <Link className="prompt-deck-card__link" to={`/prompts/${deck.id}`}>
        Open deck
        <ArrowRight aria-hidden="true" size={18} />
      </Link>
    </article>
  );
}
