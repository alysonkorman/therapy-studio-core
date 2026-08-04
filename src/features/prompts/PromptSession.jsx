import { ArrowLeft, ArrowRight, RotateCcw, Shuffle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function shufflePrompts(prompts) {
  const shuffled = [...prompts];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

export default function PromptSession({ deck, onFirstPromptDisplayed }) {
  const [promptOrder, setPromptOrder] = useState(deck.prompts);
  const [position, setPosition] = useState(0);
  const usageReported = useRef(false);

  const currentPrompt = promptOrder[position];

  useEffect(() => {
    if (currentPrompt && !usageReported.current) {
      usageReported.current = true;
      onFirstPromptDisplayed?.();
    }
  }, [currentPrompt, onFirstPromptDisplayed]);

  if (!currentPrompt) {
    return (
      <section className="prompt-session prompt-session--empty">
        <p className="eyebrow">Prompt session</p>
        <h1>{deck.title}</h1>
        <p>This deck does not contain any prompts yet.</p>
      </section>
    );
  }

  function handleShuffle() {
    setPromptOrder((currentOrder) => shufflePrompts(currentOrder));
    setPosition(0);
  }

  return (
    <section className="prompt-session" aria-labelledby="prompt-session-title">
      <header className="prompt-session__header">
        <div>
          <p className="eyebrow">Prompt session</p>
          <h1 id="prompt-session-title">{deck.title}</h1>
        </div>
        <p className="prompt-session__position" aria-live="polite">
          {position + 1} of {promptOrder.length}
        </p>
      </header>

      <div className="prompt-session__stage">
        <p key={currentPrompt.id}>{currentPrompt.text}</p>
      </div>

      <div className="prompt-session__controls" aria-label="Prompt controls">
        <button
          disabled={position === 0}
          onClick={() => setPosition((current) => current - 1)}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={19} />
          Previous
        </button>
        <button
          disabled={position === promptOrder.length - 1}
          onClick={() => setPosition((current) => current + 1)}
          type="button"
        >
          Next
          <ArrowRight aria-hidden="true" size={19} />
        </button>
        <button onClick={handleShuffle} type="button">
          <Shuffle aria-hidden="true" size={19} />
          Shuffle
        </button>
        <button onClick={() => setPosition(0)} type="button">
          <RotateCcw aria-hidden="true" size={19} />
          Restart
        </button>
      </div>
    </section>
  );
}
