import { ArrowLeft, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { IconRenderer } from "../icons";
import PromptSession from "./PromptSession";
import PromptManageView from "./PromptManageView";
import { promptAccentStyle } from "./promptAppearance";
import { usePromptAuthoring } from "./usePromptAuthoring";
import "./PromptsPage.css";

export default function PromptDeckPage({ decks: suppliedDecks, repositories }) {
  const authoring = usePromptAuthoring({ enabled: !suppliedDecks, repositories });
  const [mode, setMode] = useState("session");
  const [showSetupGuidance, setShowSetupGuidance] = useState(false);
  const guidanceRef = useRef(null);
  const manageViewRef = useRef(null);
  const decks = suppliedDecks ?? authoring.decks;
  const { deckId } = useParams();
  const deck = decks.find((candidate) => candidate.id === deckId);

  useEffect(() => {
    if (showSetupGuidance) guidanceRef.current?.focus();
  }, [showSetupGuidance]);

  useEffect(() => {
    if (mode === "manage") manageViewRef.current?.focus();
  }, [mode]);

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
      <header className="prompt-deck-page__header" style={promptAccentStyle(deck.color)}>
        <span className="prompt-identity-icon-tile prompt-identity-icon-tile--large">
          <IconRenderer iconId={deck.iconId} size={44} />
        </span>
        <div className="prompt-deck-page__identity">
          <p className="eyebrow">
            {mode === "session" ? "Prompt deck" : "Authoring tools"}
          </p>
          <h1>{deck.title}</h1>
          {deck.description ? (
            <p className="prompt-deck-page__description">{deck.description}</p>
          ) : null}
        </div>
        <button
          className="manage-mode-toggle"
          onClick={() => {
            if (!authoring.seeded) {
              setShowSetupGuidance(true);
              return;
            }
            setShowSetupGuidance(false);
            setMode((value) => (value === "session" ? "manage" : "session"));
          }}
          type="button"
        >
          <Settings aria-hidden="true" size={18} />
          {mode === "session" ? "Manage Deck" : "Session Mode"}
        </button>
      </header>
      {showSetupGuidance && !authoring.seeded ? (
        <section
          aria-labelledby="deck-authoring-setup-title"
          className="deck-authoring-guidance"
          ref={guidanceRef}
          tabIndex={-1}
        >
          <h2 id="deck-authoring-setup-title">Set up authoring first</h2>
          <p>
            Your deck is ready to use now. Set up Prompt Authoring from the library when
            you want to edit decks and prompts.
          </p>
          <Link className="prompt-back-link" to="/prompts">
            Set up in Prompt Library
          </Link>
        </section>
      ) : null}
      {mode === "manage" ? (
        <section aria-label="Manage deck" ref={manageViewRef} tabIndex={-1}>
          <PromptManageView
            categories={authoring.categories}
            deck={deck}
            decks={decks}
            key={deck.id}
            playlists={authoring.playlists}
            repositories={authoring.repositories}
            run={authoring.run}
          />
        </section>
      ) : (
        <PromptSession deck={deck} key={deck.id} />
      )}
    </div>
  );
}
