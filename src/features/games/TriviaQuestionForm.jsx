import { useState } from "react";

export default function TriviaQuestionForm({ initial, onCancel, onSave }) {
  const [draft, setDraft] = useState({
    question: initial?.question ?? "",
    answer: initial?.answer ?? "",
    mode: initial?.choices ? "multiple" : "open",
    choices: initial?.choices?.join("\n") ?? "",
    explanation: initial?.explanation ?? "",
    category: initial?.category ?? "",
    difficulty: initial?.difficulty ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const change = (field, value) =>
    setDraft((current) => ({ ...current, [field]: value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const choices =
      draft.mode === "multiple"
        ? draft.choices
            .split("\n")
            .map((choice) => choice.trim())
            .filter(Boolean)
        : undefined;
    try {
      await onSave({
        ...(initial?.id ? { id: initial.id } : {}),
        ...(Number.isInteger(initial?.sortOrder) ? { sortOrder: initial.sortOrder } : {}),
        question: draft.question,
        answer: draft.answer,
        ...(choices ? { choices } : {}),
        ...(draft.explanation.trim() ? { explanation: draft.explanation } : {}),
        ...(draft.category.trim() ? { category: draft.category } : {}),
        ...(draft.difficulty ? { difficulty: draft.difficulty } : {}),
      });
    } catch (caughtError) {
      setError(caughtError.message);
      setSaving(false);
    }
  }

  return (
    <form className="trivia-question-form" onSubmit={submit}>
      <label>
        Question
        <input
          autoFocus
          required
          value={draft.question}
          onChange={(event) => change("question", event.target.value)}
        />
      </label>
      <label>
        Answer
        <input
          required
          value={draft.answer}
          onChange={(event) => change("answer", event.target.value)}
        />
      </label>
      <label>
        Question Type
        <select
          value={draft.mode}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              mode: event.target.value,
              ...(event.target.value === "open" ? { choices: "" } : {}),
            }))
          }
        >
          <option value="open">Open Answer</option>
          <option value="multiple">Multiple Choice</option>
        </select>
      </label>
      {draft.mode === "multiple" ? (
        <label>
          Choices (one per line, 2–6)
          <textarea
            required
            value={draft.choices}
            onChange={(event) => change("choices", event.target.value)}
          />
        </label>
      ) : null}
      <div className="trivia-form-grid">
        <label>
          Explanation
          <input
            value={draft.explanation}
            onChange={(event) => change("explanation", event.target.value)}
          />
        </label>
        <label>
          Category
          <input
            value={draft.category}
            onChange={(event) => change("category", event.target.value)}
          />
        </label>
        <label>
          Difficulty
          <select
            value={draft.difficulty}
            onChange={(event) => change("difficulty", event.target.value)}
          >
            <option value="">Use Set Difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
          </select>
        </label>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      <div className="trivia-authoring-actions">
        <button
          className="studio-button studio-button--primary"
          disabled={saving}
          type="submit"
        >
          Save Question
        </button>
        <button
          className="studio-button studio-button--secondary"
          disabled={saving}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
