import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import SessionProfileChipEditor from "./SessionProfileChipEditor";

const listFields = [
  ["diagnoses", "Diagnoses"],
  ["goals", "Goals"],
  ["interests", "Interests"],
  ["presentingConcerns", "Presenting Concerns"],
  ["currentPresentationDefaults", "Current Presentation Defaults"],
  ["preferredActivities", "Preferred Activities"],
];
const advancedLists = [
  ["communicationStyle", "Communication Style"],
  ["energyPatterns", "Energy Patterns"],
  ["sensoryPreferences", "Sensory Preferences"],
  ["regulationStrategies", "Regulation Strategies"],
  ["movementNeeds", "Movement Needs"],
  ["transitionSupports", "Transition Supports"],
  ["humorPreferences", "Humor"],
  ["motivators", "Motivators"],
  ["reinforcementPreferences", "Reinforcement Preferences"],
  ["materialsUsuallyAvailable", "Materials Usually Available"],
  ["strengths", "Strengths"],
  ["thingsToAvoid", "Things To Avoid"],
  ["customTags", "Custom Tags"],
];
const advancedText = [
  ["readingTolerance", "Reading Tolerance"],
  ["writingTolerance", "Writing Tolerance"],
  ["attentionSpan", "Attention Span"],
  ["parentInvolvement", "Parent Involvement"],
];

export default function SessionProfileEditor({ initialProfile, onCancel, onSave }) {
  const [draft, setDraft] = useState(() => ({
    displayName: "",
    ageRange: null,
    pronouns: null,
    diagnoses: [],
    goals: [],
    presentingConcerns: [],
    interests: [],
    preferredActivities: [],
    currentPresentationDefaults: [],
    sessionLengthPreference: null,
    telehealth: null,
    communicationStyle: [],
    readingTolerance: null,
    writingTolerance: null,
    attentionSpan: null,
    energyPatterns: [],
    humorPreferences: [],
    motivators: [],
    reinforcementPreferences: [],
    sensoryPreferences: [],
    regulationStrategies: [],
    movementNeeds: [],
    transitionSupports: [],
    thingsToAvoid: [],
    strengths: [],
    materialsUsuallyAvailable: [],
    parentInvolvement: null,
    customTags: [],
    generalReminders: "",
    ...initialProfile,
  }));
  const [advanced, setAdvanced] = useState(false);
  const [error, setError] = useState("");
  const change = (field, value) =>
    setDraft((current) => ({ ...current, [field]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await onSave(draft);
    } catch (saveError) {
      setError(saveError.message);
    }
  };
  return (
    <form className="session-profile-editor" onSubmit={submit}>
      <p className="profile-privacy-notice">
        Use a nickname or general label. Do not enter identifying client information.
      </p>
      <div className="profile-form-grid">
        <label>
          Profile Name
          <input
            autoFocus
            onChange={(event) => change("displayName", event.target.value)}
            required
            value={draft.displayName}
          />
        </label>
        <label>
          Age Range
          <input
            onChange={(event) => change("ageRange", event.target.value || null)}
            value={draft.ageRange ?? ""}
          />
        </label>
        <label>
          Pronouns (Optional)
          <input
            onChange={(event) => change("pronouns", event.target.value || null)}
            value={draft.pronouns ?? ""}
          />
        </label>
        <label>
          Session Length
          <input
            min="1"
            onChange={(event) =>
              change(
                "sessionLengthPreference",
                event.target.value ? Number(event.target.value) : null
              )
            }
            type="number"
            value={draft.sessionLengthPreference ?? ""}
          />
        </label>
        <label>
          Telehealth
          <select
            onChange={(event) =>
              change(
                "telehealth",
                event.target.value === "" ? null : event.target.value === "yes"
              )
            }
            value={draft.telehealth === null ? "" : draft.telehealth ? "yes" : "no"}
          >
            <option value="">No preference</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      </div>
      {listFields.map(([field, label]) => (
        <SessionProfileChipEditor
          key={field}
          label={label}
          onChange={(values) => change(field, values)}
          values={draft[field]}
        />
      ))}
      <button
        aria-expanded={advanced}
        className="profile-disclosure"
        onClick={() => setAdvanced((value) => !value)}
        type="button"
      >
        {advanced ? "Hide Advanced Context" : "Show Advanced Context"}
        {advanced ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
      </button>
      {advanced ? (
        <section className="profile-advanced">
          <div className="profile-form-grid">
            {advancedText.map(([field, label]) => (
              <label key={field}>
                {label}
                <input
                  onChange={(event) => change(field, event.target.value || null)}
                  value={draft[field] ?? ""}
                />
              </label>
            ))}
          </div>
          {advancedLists.map(([field, label]) => (
            <SessionProfileChipEditor
              key={field}
              label={label}
              onChange={(values) => change(field, values)}
              values={draft[field]}
            />
          ))}
          <label>
            General Reminders
            <textarea
              onChange={(event) => change("generalReminders", event.target.value)}
              value={draft.generalReminders}
            />
          </label>
        </section>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <div className="profile-actions">
        <button className="primary-button" type="submit">
          Save Session Profile
        </button>
        <button onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </form>
  );
}
