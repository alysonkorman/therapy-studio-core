import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { promptDecks } from "../../data/resources";
import PromptSession from "./PromptSession";
import "./PromptsPage.css";

export default function PromptDeckPage({ decks = promptDecks }) {
  const { deckId } = useParams();
  const deck = decks.find((candidate) => candidate.id === deckId);

  if (!deck) {
    return (
      <section className="prompt-route-message">
        <p className="eyebrow">Deck not found</p>
        <h1>We couldn’t find that prompt deck.</h1>
        <p>It may have moved, or the link may be incorrect.</p>
        <Link className="prompt-back-link" to="/prompts">
          <ArrowLeft aria-hidden="true" size={18} />
          Back to Prompt Library
        </Link>
      </section>
    );
  }

  return (
    <div className="prompt-deck-page">
      <Link className="prompt-back-link" to="/prompts">
        <ArrowLeft aria-hidden="true" size={18} />
        Back to Prompt Library
      </Link>
      <PromptSession deck={deck} key={deck.id} />
    </div>
  );
}
