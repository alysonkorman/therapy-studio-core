import { nanoid } from "nanoid";
import { ArrowLeft, Copy, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { EmptyState, Page, Section } from "../../components/layout";
import { triviaRepository } from "../../lib/data";
import IconBrowserField from "../icons/IconBrowserField";
import TriviaQuestionForm from "./TriviaQuestionForm";
import "./GamesPage.css";

const join = (values) => values.join(", ");
const list = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

function metadataDraft(game) {
  return {
    title: game.title,
    description: game.description,
    category: game.category,
    difficulty: game.difficulty,
    iconId: game.iconId,
    color: game.color,
    pointsEnabled: game.pointsEnabled,
    tags: join(game.tags),
    goals: join(game.goals),
    diagnoses: join(game.diagnoses),
    ageRanges: join(game.ageRanges),
  };
}

export default function TriviaEditorPage({
  gameId: suppliedId,
  repository = triviaRepository,
}) {
  const { gameId: routeId } = useParams();
  const gameId = suppliedId ?? routeId;
  const [game, setGame] = useState(null);
  const [status, setStatus] = useState("loading");
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    repository
      .getTriviaSetById(gameId)
      .then((value) => {
        if (!active) return;
        setGame(value);
        setDraft(metadataDraft(value));
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("missing");
      });
    return () => {
      active = false;
    };
  }, [gameId, repository]);

  async function saveQuestions(questions) {
    const normalized = questions.map((question, index) => ({
      ...question,
      sortOrder: index,
    }));
    const saved = await repository.updateTriviaSet(game.id, { questions: normalized });
    setGame(saved);
    setEditingId(null);
    setAdding(false);
  }

  if (status === "loading")
    return (
      <Page title="Manage Trivia">
        <p role="status">Loading Trivia Set…</p>
      </Page>
    );
  if (status === "missing" || !game)
    return (
      <Page title="Trivia Set Not Found">
        <EmptyState
          action={
            <Link className="studio-button studio-button--primary" to="/games">
              Back to Games
            </Link>
          }
          title="We Couldn’t Find That Trivia Set"
        />
      </Page>
    );
  if (game.starter)
    return (
      <Page title="Starter Trivia Is Protected">
        <EmptyState
          action={
            <Link className="studio-button studio-button--primary" to="/games">
              Duplicate to Edit in Games
            </Link>
          }
          description="Therapy Studio starters remain unchanged."
          title="Duplicate This Starter First"
        />
      </Page>
    );

  const change = (field, value) =>
    setDraft((current) => ({ ...current, [field]: value }));
  return (
    <Page
      actions={
        <Link className="studio-button studio-button--secondary" to="/games">
          <ArrowLeft aria-hidden="true" size={17} />
          Back to Games
        </Link>
      }
      className="trivia-editor"
      description="Edit set details and questions. Changes stay attached to this Resource."
      title={`Manage ${game.title}`}
    >
      <Section title="Set Details">
        <form
          className="trivia-metadata-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            try {
              const saved = await repository.updateTriviaSet(game.id, {
                ...draft,
                tags: list(draft.tags),
                goals: list(draft.goals),
                diagnoses: list(draft.diagnoses),
                ageRanges: list(draft.ageRanges),
              });
              setGame(saved);
              setDraft(metadataDraft(saved));
            } catch (caughtError) {
              setError(caughtError.message);
            }
          }}
        >
          <label>
            Title
            <input
              required
              value={draft.title}
              onChange={(event) => change("title", event.target.value)}
            />
          </label>
          <label>
            Description
            <textarea
              value={draft.description}
              onChange={(event) => change("description", event.target.value)}
            />
          </label>
          <div className="trivia-form-grid">
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
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="mixed">Mixed</option>
              </select>
            </label>
            <label>
              Accent Color
              <input
                aria-label="Accent Color"
                type="color"
                value={draft.color}
                onChange={(event) => change("color", event.target.value)}
              />
            </label>
            <IconBrowserField
              actionLabel={draft.iconId ? "Change Icon" : "Choose Icon"}
              label="Trivia Set Icon"
              onSave={(iconId) => change("iconId", iconId)}
              value={draft.iconId}
            />
          </div>
          <label className="trivia-checkbox">
            <input
              checked={draft.pointsEnabled}
              onChange={(event) => change("pointsEnabled", event.target.checked)}
              type="checkbox"
            />
            Use points by default
          </label>
          <div className="trivia-form-grid">
            <label>
              Tags
              <input
                value={draft.tags}
                onChange={(event) => change("tags", event.target.value)}
              />
            </label>
            <label>
              Goals
              <input
                value={draft.goals}
                onChange={(event) => change("goals", event.target.value)}
              />
            </label>
            <label>
              Diagnoses
              <input
                value={draft.diagnoses}
                onChange={(event) => change("diagnoses", event.target.value)}
              />
            </label>
            <label>
              Age Ranges
              <input
                value={draft.ageRanges}
                onChange={(event) => change("ageRanges", event.target.value)}
              />
            </label>
          </div>
          {error ? <p role="alert">{error}</p> : null}
          <button className="studio-button studio-button--primary" type="submit">
            Save Set Details
          </button>
        </form>
      </Section>
      <Section
        actions={
          <button
            className="studio-button studio-button--primary"
            onClick={() => setAdding(true)}
            type="button"
          >
            <Plus aria-hidden="true" size={17} />
            Add Question
          </button>
        }
        description={`${game.questions.length} questions`}
        title="Questions"
      >
        {adding ? (
          <TriviaQuestionForm
            onCancel={() => setAdding(false)}
            onSave={(question) =>
              saveQuestions([
                ...game.questions,
                { ...question, id: nanoid(), sortOrder: game.questions.length },
              ])
            }
          />
        ) : null}
        <ol className="trivia-question-list">
          {game.questions.map((question, index) => (
            <li key={question.id}>
              <article>
                <strong>{question.question}</strong>
                <span>{question.choices ? "Multiple Choice" : "Open Answer"}</span>
                {editingId === question.id ? (
                  <TriviaQuestionForm
                    initial={question}
                    onCancel={() => setEditingId(null)}
                    onSave={(updated) =>
                      saveQuestions(
                        game.questions.map((item) =>
                          item.id === question.id ? updated : item
                        )
                      )
                    }
                  />
                ) : (
                  <div className="trivia-question-actions">
                    <button onClick={() => setEditingId(question.id)} type="button">
                      Edit
                    </button>
                    <button
                      disabled={index === 0}
                      onClick={() => {
                        const next = [...game.questions];
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        void saveQuestions(next);
                      }}
                      type="button"
                    >
                      Move Up
                    </button>
                    <button
                      disabled={index === game.questions.length - 1}
                      onClick={() => {
                        const next = [...game.questions];
                        [next[index], next[index + 1]] = [next[index + 1], next[index]];
                        void saveQuestions(next);
                      }}
                      type="button"
                    >
                      Move Down
                    </button>
                    <button
                      onClick={() => {
                        const next = [...game.questions];
                        next.splice(index + 1, 0, { ...question, id: nanoid() });
                        void saveQuestions(next);
                      }}
                      type="button"
                    >
                      <Copy aria-hidden="true" size={15} />
                      Duplicate
                    </button>
                    <button
                      onClick={() =>
                        void saveQuestions(
                          game.questions.filter(({ id }) => id !== question.id)
                        )
                      }
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={15} />
                      Delete
                    </button>
                  </div>
                )}
              </article>
            </li>
          ))}
        </ol>
      </Section>
    </Page>
  );
}
