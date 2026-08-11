import { ArrowLeft, ArrowRight, RotateCcw, Shuffle } from "lucide-react";
import { useRef, useState } from "react";

function shuffledQuestions(questions, random = Math.random) {
  const result = [...questions];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function Score({ label, score, onChange }) {
  return (
    <div className="trivia-score">
      <strong>{label}</strong>
      <span aria-live="polite">{score}</span>
      <div>
        <button
          aria-label={`Remove point from ${label}`}
          disabled={score === 0}
          onClick={() => onChange(-1)}
          type="button"
        >
          −
        </button>
        <button
          aria-label={`Add point to ${label}`}
          onClick={() => onChange(1)}
          type="button"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function TriviaSession({ game, onMeaningfulUse, random = Math.random }) {
  const [order, setOrder] = useState(game.questions);
  const [position, setPosition] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [scoreMode, setScoreMode] = useState(game.pointsEnabled ? "one" : "practice");
  const [scores, setScores] = useState([0, 0]);
  const useReported = useRef(false);
  const current = order[position];

  function revealAnswer() {
    setAnswerVisible(true);
    if (!useReported.current) {
      useReported.current = true;
      onMeaningfulUse?.();
    }
  }

  function move(nextPosition) {
    setPosition(nextPosition);
    setAnswerVisible(false);
  }

  function restart() {
    move(0);
    setScores([0, 0]);
  }

  if (!current) {
    return (
      <section className="trivia-session trivia-session--empty">
        <h2>No Questions Yet</h2>
        <p>This Trivia Set is empty and cannot be played yet.</p>
      </section>
    );
  }

  const scoreCount = scoreMode === "two" ? 2 : scoreMode === "one" ? 1 : 0;

  return (
    <section className="trivia-session" aria-labelledby="trivia-question">
      <div className="trivia-session__toolbar">
        <label>
          Scoring
          <select
            onChange={(event) => {
              setScoreMode(event.target.value);
              setScores([0, 0]);
            }}
            value={scoreMode}
          >
            <option value="practice">No Score / Practice</option>
            <option value="one">1 Player</option>
            <option value="two">2 Teams</option>
          </select>
        </label>
        <p aria-live="polite">
          {position + 1} of {order.length}
        </p>
      </div>

      {scoreCount ? (
        <div className="trivia-scores" aria-label="Scores">
          {Array.from({ length: scoreCount }, (_, index) => (
            <Score
              key={index}
              label={scoreMode === "one" ? "Player" : `Team ${index + 1}`}
              score={scores[index]}
              onChange={(amount) =>
                setScores((currentScores) =>
                  currentScores.map((score, scoreIndex) =>
                    scoreIndex === index ? Math.max(0, score + amount) : score
                  )
                )
              }
            />
          ))}
        </div>
      ) : null}

      <article className="trivia-question-card">
        <p className="eyebrow">{current.category ?? game.category ?? "Trivia"}</p>
        <h2 id="trivia-question">{current.question}</h2>
        {current.choices ? (
          <ol className="trivia-choices">
            {current.choices.map((choice) => (
              <li key={choice}>{choice}</li>
            ))}
          </ol>
        ) : (
          <p className="trivia-open-answer">Open answer</p>
        )}
        {answerVisible ? (
          <div className="trivia-answer" role="status">
            <span>Answer</span>
            <strong>{current.answer}</strong>
            {current.explanation ? <p>{current.explanation}</p> : null}
          </div>
        ) : (
          <button
            className="studio-button studio-button--primary trivia-reveal"
            onClick={revealAnswer}
            type="button"
          >
            Reveal Answer
          </button>
        )}
      </article>

      <div className="trivia-session__controls" aria-label="Trivia controls">
        <button
          disabled={position === 0}
          onClick={() => move(position - 1)}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={18} />
          Previous
        </button>
        <button
          disabled={position === order.length - 1}
          onClick={() => move(position + 1)}
          type="button"
        >
          Next
          <ArrowRight aria-hidden="true" size={18} />
        </button>
        <button
          onClick={() => {
            setOrder(shuffledQuestions(order, random));
            move(0);
          }}
          type="button"
        >
          <Shuffle aria-hidden="true" size={18} />
          Shuffle
        </button>
        <button onClick={restart} type="button">
          <RotateCcw aria-hidden="true" size={18} />
          Restart
        </button>
      </div>
    </section>
  );
}
