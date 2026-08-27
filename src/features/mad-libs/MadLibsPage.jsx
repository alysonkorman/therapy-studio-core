import { ArrowLeft, Heart, Maximize2, Play, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Page } from "../../components/layout";
import { madLibById, madLibTemplates } from "./madLibTemplates";
import { loadCustomMadLibs } from "./madLibStore";
import "./MadLibsPage.css";

const key = "therapy-studio:mad-libs";
const load = () => {
  try {
    return JSON.parse(
      localStorage.getItem(key) || '{"favorites":[],"recent":[],"progress":{}}'
    );
  } catch {
    return { favorites: [], recent: [], progress: {} };
  }
};
const save = (value) => localStorage.setItem(key, JSON.stringify(value));
const render = (template, answers) =>
  template.paragraphs.map((paragraph) =>
    paragraph
      .split(/(\{[^}]+\})/)
      .map((part, index) =>
        part.startsWith("{") ? (
          <mark key={index}>
            {answers[
              template.blanks.findIndex((blank) => `{${blank.id.split("-")[0]}}` === part)
            ] || part.slice(1, -1)}
          </mark>
        ) : (
          part
        )
      )
  );

export function MadLibLibrary() {
  const navigate = useNavigate();
  const [state, setState] = useState(load);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const allTemplates = [...madLibTemplates, ...loadCustomMadLibs()];
  const templates = useMemo(
    () =>
      allTemplates.filter(
        (item) =>
          (!search ||
            `${item.title} ${item.description} ${item.category} ${item.tone}`
              .toLowerCase()
              .includes(search.toLowerCase())) &&
          (category === "All" || item.category === category)
      ),
    [search, category, allTemplates.length]
  );
  const favorite = (id) => {
    const next = {
      ...state,
      favorites: state.favorites.includes(id)
        ? state.favorites.filter((item) => item !== id)
        : [...state.favorites, id],
    };
    setState(next);
    save(next);
  };
  return (
    <Page
      className="mad-libs"
      description="Pick a story, collect silly words one at a time, then reveal the surprise."
      title="Mad Libs"
    >
      <Link
        className="studio-button studio-button--primary"
        to="/activities/mad-libs/new"
      >
        + New Mad Lib
      </Link>
      <div className="mad-libs__controls">
        <Search size={18} />
        <input
          aria-label="Search Mad Libs"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search Mad Libs…"
          value={search}
        />
        <select
          aria-label="Category"
          onChange={(event) => setCategory(event.target.value)}
          value={category}
        >
          <option>All</option>
          {[...new Set(madLibTemplates.map((item) => item.category))].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      <div className="mad-libs__grid">
        {templates.map((template) => (
          <article className="mad-lib-card" key={template.id}>
            <button
              aria-label="Favorite"
              className={state.favorites.includes(template.id) ? "is-favorite" : ""}
              onClick={() => favorite(template.id)}
              type="button"
            >
              <Heart
                fill={state.favorites.includes(template.id) ? "currentColor" : "none"}
              />
            </button>
            <span className="resource-type-badge">{template.length}</span>
            <h2>{template.title}</h2>
            <p>{template.description}</p>
            <small>
              {template.category} · {template.tone} · {template.blanks.length} words
            </small>
            <Link
              className="studio-button studio-button--secondary"
              to={`/activities/mad-libs/${template.id}/edit`}
            >
              {template.custom ? "Edit" : "Duplicate & Edit"}
            </Link>
            <button
              className="studio-button studio-button--primary"
              onClick={() => navigate(`/activities/mad-libs/${template.id}`)}
              type="button"
            >
              <Play size={17} /> Choose
            </button>
          </article>
        ))}
      </div>
    </Page>
  );
}
export function MadLibPlayPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const template =
    madLibById(templateId) ?? loadCustomMadLibs().find((item) => item.id === templateId);
  const [saved, setSaved] = useState(load);
  const savedProgress = saved.progress?.[templateId];
  const [answers, setAnswers] = useState(savedProgress?.answers ?? []);
  const [index, setIndex] = useState(savedProgress?.index ?? 0);
  const [value, setValue] = useState(
    savedProgress?.answers?.[savedProgress?.index] ?? ""
  );
  const [fullscreen, setFullscreen] = useState(false);
  const complete = index >= (template?.blanks.length ?? 0);
  useEffect(() => {
    if (!template) return;
    const next = {
      ...saved,
      progress: { ...saved.progress, [templateId]: { answers, index } },
    };
    setSaved(next);
    save(next);
  }, [answers, index]);
  if (!template)
    return (
      <Page title="Mad Lib Not Found">
        <Link to="/activities/mad-libs">Back to Mad Libs</Link>
      </Page>
    );
  const blank = template.blanks[index];
  const next = () => {
    const updated = [...answers];
    updated[index] = value.trim();
    setAnswers(updated);
    setIndex(index + 1);
    setValue(updated[index + 1] ?? "");
    if (!saved.recent.includes(templateId)) {
      const nextState = { ...saved, recent: [templateId, ...saved.recent].slice(0, 12) };
      setSaved(nextState);
      save(nextState);
    }
  };
  const back = () => {
    const previous = Math.max(0, index - 1);
    setIndex(previous);
    setValue(answers[previous] ?? "");
  };
  const restart = () => {
    setAnswers([]);
    setIndex(0);
    setValue("");
  };
  const full = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.querySelector(".mad-lib-play")?.requestFullscreen();
    setFullscreen(!fullscreen);
  };
  return (
    <Page
      actions={
        <Link
          className="studio-button studio-button--secondary"
          to="/activities/mad-libs"
        >
          <ArrowLeft size={17} /> Choose Another
        </Link>
      }
      className="mad-lib-play"
      description={
        complete
          ? "Your story is ready."
          : "Fill in one word at a time — the story stays secret until the end."
      }
      title={template.title}
    >
      <button
        className="studio-button studio-button--secondary"
        onClick={full}
        type="button"
      >
        <Maximize2 size={17} /> Full Screen
      </button>
      {complete ? (
        <section className="mad-lib-story">
          {render(template, answers).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          <div>
            <button
              className="studio-button studio-button--primary"
              onClick={restart}
              type="button"
            >
              Play Again
            </button>
            <Link
              className="studio-button studio-button--secondary"
              to="/activities/mad-libs"
            >
              Choose Another
            </Link>
          </div>
        </section>
      ) : (
        <section className="mad-lib-prompt">
          <span>
            {index + 1} of {template.blanks.length}
          </span>
          <h2>Give me {blank.prompt}</h2>
          <p>
            {blank.hint} For example: {blank.examples[index % blank.examples.length]}.
          </p>
          <input
            autoFocus
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && value.trim() && next()}
            value={value}
          />
          <div>
            <button
              className="studio-button studio-button--secondary"
              disabled={!index}
              onClick={back}
              type="button"
            >
              Back
            </button>
            <button
              className="studio-button studio-button--primary"
              disabled={!value.trim()}
              onClick={next}
              type="button"
            >
              Next
            </button>
          </div>
        </section>
      )}
    </Page>
  );
}
