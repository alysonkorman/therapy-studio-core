import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Page } from "../../components/layout";
import { madLibById } from "./madLibTemplates";
import {
  blankTypes,
  duplicateMadLib,
  loadCustomMadLibs,
  saveCustomMadLibs,
} from "./madLibStore";
import "./MadLibsPage.css";
export default function MadLibBuilderPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const customs = loadCustomMadLibs();
  const source = customs.find((item) => item.id === templateId) ?? madLibById(templateId);
  const [draft, setDraft] = useState(() =>
    source?.custom
      ? source
      : source
        ? duplicateMadLib(source)
        : {
            id: `custom-${crypto.randomUUID()}`,
            custom: true,
            title: "Untitled Mad Lib",
            description: "",
            category: "Silly",
            tone: "Silly",
            age: "child",
            length: "Quick",
            tags: [],
            paragraphs: [""],
            blanks: [],
          }
  );
  const story = draft.paragraphs.join("\n\n");
  const addBlank = () => {
    const blank = {
      id: `blank-${draft.blanks.length + 1}`,
      prompt: "a noun",
      hint: "Any person, place, or thing.",
      examples: ["pancake"],
    };
    setDraft({
      ...draft,
      blanks: [...draft.blanks, blank],
      paragraphs: [`${story}{${blank.id}}`],
    });
  };
  const save = () => {
    const next = [
      ...customs.filter((item) => item.id !== draft.id),
      { ...draft, paragraphs: [story] },
    ];
    saveCustomMadLibs(next);
    navigate("/activities/mad-libs");
  };
  return (
    <Page
      title="Mad Lib Builder"
      description="Write naturally, then add editable blanks wherever the story needs one."
    >
      <section className="mad-lib-story">
        <input
          aria-label="Title"
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          value={draft.title}
        />
        <textarea
          aria-label="Story"
          onChange={(e) => setDraft({ ...draft, paragraphs: [e.target.value] })}
          rows="12"
          value={story}
        />
        <div>
          <button
            className="studio-button studio-button--secondary"
            onClick={addBlank}
            type="button"
          >
            Insert Blank
          </button>
          <button
            className="studio-button studio-button--primary"
            onClick={save}
            type="button"
          >
            Save Mad Lib
          </button>
          <Link
            className="studio-button studio-button--secondary"
            to="/activities/mad-libs"
          >
            Cancel
          </Link>
        </div>
        {draft.blanks.map((blank, index) => (
          <label key={blank.id}>
            Blank {index + 1}
            <select
              onChange={(e) =>
                setDraft({
                  ...draft,
                  blanks: draft.blanks.map((item, i) =>
                    i === index ? { ...item, prompt: e.target.value } : item
                  ),
                })
              }
              value={blank.prompt}
            >
              {blankTypes.map((type) => (
                <option key={type}>a {type}</option>
              ))}
            </select>
            <input
              onChange={(e) =>
                setDraft({
                  ...draft,
                  blanks: draft.blanks.map((item, i) =>
                    i === index ? { ...item, hint: e.target.value } : item
                  ),
                })
              }
              value={blank.hint}
            />
          </label>
        ))}
      </section>
    </Page>
  );
}
