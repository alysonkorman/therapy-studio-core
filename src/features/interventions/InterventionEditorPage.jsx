import { ArrowLeft, Minus, Plus } from "lucide-react";
import { nanoid } from "nanoid";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { EmptyState, Page, Section } from "../../components/layout";
import { interventionRepository } from "../../lib/data";
import "./InterventionsPage.css";

const list = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
const join = (value = []) => value.join(", ");
const text = (value = "") => value;

const listFields = [
  ["steps", "Steps", true],
  ["therapistPrompts", "Therapist Prompts"],
  ["processingQuestions", "Processing Questions"],
  ["adaptations", "Adaptations"],
  ["cautions", "Considerations"],
  ["whenToUse", "When to Use It"],
];

function initialDraft(pair) {
  const { resource, guidance } = pair;
  return {
    title: resource.title,
    description: resource.description,
    goals: join(resource.goals),
    diagnoses: join(resource.diagnoses),
    ageRanges: join(resource.ageRanges),
    tags: join(resource.tags),
    durationMinutes: resource.durationMinutes ?? "",
    materials: join(resource.materials),
    overview: guidance.overview,
    introduction: guidance.introduction,
    sourceStatus: guidance.sourceStatus,
    ...Object.fromEntries(listFields.map(([key]) => [key, guidance[key] ?? []])),
  };
}

function blankDraft() {
  return {
    title: "",
    description: "",
    goals: "",
    diagnoses: "",
    ageRanges: "",
    tags: "",
    durationMinutes: "",
    materials: "",
    overview: "",
    introduction: "",
    sourceStatus: "Therapist-created in Therapy Studio",
    steps: [""],
    therapistPrompts: [],
    processingQuestions: [],
    adaptations: [],
    cautions: [],
    whenToUse: [],
  };
}

function RepeatableField({ label, onChange, required, value }) {
  function update(index, next) {
    onChange(value.map((item, itemIndex) => (itemIndex === index ? next : item)));
  }
  function move(index, direction) {
    const next = [...value];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange(next);
  }
  return (
    <fieldset className="intervention-editor__repeatable">
      <legend>{label}</legend>
      {value.map((item, index) => (
        <div className="intervention-editor__repeatable-row" key={`${label}-${index}`}>
          <input
            aria-label={`${label} ${index + 1}`}
            required={required}
            value={item}
            onChange={(event) => update(index, event.target.value)}
          />
          <button disabled={index === 0} onClick={() => move(index, -1)} type="button">
            Move Up
          </button>
          <button
            disabled={index === value.length - 1}
            onClick={() => move(index, 1)}
            type="button"
          >
            Move Down
          </button>
          <button
            onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
            type="button"
          >
            <Minus aria-hidden="true" size={15} /> Remove
          </button>
        </div>
      ))}
      <button onClick={() => onChange([...value, ""])} type="button">
        <Plus aria-hidden="true" size={15} /> Add {label.slice(0, -1)}
      </button>
    </fieldset>
  );
}

export default function InterventionEditorPage({ repository = interventionRepository }) {
  const { interventionId } = useParams();
  const navigate = useNavigate();
  const creating = interventionId === "new";
  const [pair, setPair] = useState(null);
  const [draft, setDraft] = useState(() => (creating ? blankDraft() : null));
  const [status, setStatus] = useState(creating ? "ready" : "loading");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (creating) return undefined;
    let active = true;
    repository
      .getInterventionPair(interventionId)
      .then((loaded) => {
        if (!active) return;
        if (loaded.resource.starter) {
          setStatus("protected");
        } else {
          setPair(loaded);
          setDraft(initialDraft(loaded));
          setStatus("ready");
        }
      })
      .catch(() => active && setStatus("missing"));
    return () => {
      active = false;
    };
  }, [creating, interventionId, repository]);

  if (status === "loading")
    return (
      <Page title="Intervention">
        <p role="status">Loading Intervention…</p>
      </Page>
    );
  if (status !== "ready" || !draft)
    return (
      <Page title="Intervention Editor">
        <EmptyState
          action={
            <Link className="studio-button studio-button--primary" to="/interventions">
              Back to Interventions
            </Link>
          }
          description={
            status === "protected"
              ? "Duplicate this Therapy Studio starter before editing it."
              : "This Intervention is unavailable."
          }
          title={
            status === "protected"
              ? "Starter Intervention Is Protected"
              : "Intervention Not Found"
          }
        />
      </Page>
    );

  const change = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const timestamp = new Date().toISOString();
      const { starter, archived, ...existingResource } = pair?.resource ?? {};
      void starter;
      void archived;
      const resource = {
        ...existingResource,
        id: pair?.resource.id ?? nanoid(),
        type: "intervention",
        title: draft.title.trim(),
        description: draft.description.trim(),
        tags: list(draft.tags),
        goals: list(draft.goals),
        diagnoses: list(draft.diagnoses),
        ageRanges: list(draft.ageRanges),
        materials: list(draft.materials),
        durationMinutes:
          draft.durationMinutes === "" ? null : Number(draft.durationMinutes),
        telehealthFriendly: true,
        source: pair?.resource.source ?? "Therapist-created in Therapy Studio",
        createdAt: pair?.resource.createdAt ?? timestamp,
        updatedAt: timestamp,
        worksWellWhen: pair?.resource.worksWellWhen ?? [],
        useWith: pair?.resource.useWith ?? [],
        kidsWhoLike: pair?.resource.kidsWhoLike ?? [],
        settings: pair?.resource.settings ?? [],
        research: pair?.resource.research ?? [],
        myNotes: pair?.resource.myNotes ?? "",
        rating: pair?.resource.rating ?? null,
        favorite: pair?.resource.favorite ?? false,
        relatedResourceIds: pair?.resource.relatedResourceIds ?? [],
        usageCount: pair?.resource.usageCount ?? 0,
        lastUsedAt: pair?.resource.lastUsedAt ?? null,
      };
      const guidance = {
        resourceId: resource.id,
        overview: draft.overview.trim(),
        introduction: draft.introduction.trim(),
        sourceStatus: draft.sourceStatus.trim(),
        ...Object.fromEntries(
          listFields.map(([key]) => [
            key,
            draft[key]
              .map(text)
              .map((item) => item.trim())
              .filter(Boolean),
          ])
        ),
      };
      const saved = creating
        ? await repository.createIntervention({ resource, guidance })
        : await repository.updateIntervention(resource.id, { resource, guidance });
      navigate(`/interventions/${saved.resource.id}`);
    } catch (caught) {
      setError(caught.message || "Intervention could not be saved.");
      setSaving(false);
    }
  }
  return (
    <Page
      actions={
        <Link className="studio-button studio-button--secondary" to="/interventions">
          <ArrowLeft aria-hidden="true" size={17} /> Back to Interventions
        </Link>
      }
      className="intervention-editor"
      description="Create a telehealth-ready activity that can be used without shared physical materials."
      title={creating ? "New Intervention" : `Edit ${pair.resource.title}`}
    >
      <form onSubmit={save}>
        <Section title="Basics">
          <div className="intervention-editor__grid">
            <label>
              Title
              <input
                autoFocus
                required
                value={draft.title}
                onChange={(event) => change("title", event.target.value)}
              />
            </label>
            <label className="intervention-editor__wide">
              Description
              <textarea
                value={draft.description}
                onChange={(event) => change("description", event.target.value)}
              />
            </label>
          </div>
        </Section>
        <Section title="Clinical Fit">
          <div className="intervention-editor__grid">
            {[
              ["Goals", "goals"],
              ["Diagnoses or Concerns", "diagnoses"],
              ["Age Ranges", "ageRanges"],
              ["Tags", "tags"],
              ["Materials", "materials"],
            ].map(([label, key]) => (
              <label key={key}>
                {label}
                <input
                  value={draft[key]}
                  onChange={(event) => change(key, event.target.value)}
                />
              </label>
            ))}
            <label>
              Duration (minutes)
              <input
                min="1"
                type="number"
                value={draft.durationMinutes}
                onChange={(event) => change("durationMinutes", event.target.value)}
              />
            </label>
          </div>
        </Section>
        <Section title="Intervention">
          <div className="intervention-editor__grid">
            <label className="intervention-editor__wide">
              Overview
              <textarea
                required
                value={draft.overview}
                onChange={(event) => change("overview", event.target.value)}
              />
            </label>
            <label className="intervention-editor__wide">
              Introduction or Setup
              <textarea
                required
                value={draft.introduction}
                onChange={(event) => change("introduction", event.target.value)}
              />
            </label>
          </div>
          <RepeatableField
            label="Steps"
            required
            value={draft.steps}
            onChange={(value) => change("steps", value)}
          />
        </Section>
        <Section title="Prompts & Processing">
          {listFields.slice(1, 3).map(([key, label]) => (
            <RepeatableField
              key={key}
              label={label}
              value={draft[key]}
              onChange={(value) => change(key, value)}
            />
          ))}
        </Section>
        <Section title="Adaptations & Considerations">
          {listFields.slice(3).map(([key, label]) => (
            <RepeatableField
              key={key}
              label={label}
              value={draft[key]}
              onChange={(value) => change(key, value)}
            />
          ))}
        </Section>
        <Section title="Source">
          <label className="intervention-editor__wide">
            Source or Attribution
            <input
              required
              value={draft.sourceStatus}
              onChange={(event) => change("sourceStatus", event.target.value)}
            />
          </label>
        </Section>
        {error ? <p role="alert">{error}</p> : null}
        <div className="intervention-editor__actions">
          <button
            className="studio-button studio-button--primary"
            disabled={saving}
            type="submit"
          >
            {saving ? "Saving…" : creating ? "Create Intervention" : "Save Intervention"}
          </button>
          <Link className="studio-button studio-button--secondary" to="/interventions">
            Cancel
          </Link>
        </div>
      </form>
    </Page>
  );
}
