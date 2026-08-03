import { ChevronDown, ChevronUp, Trash2, UserRound } from "lucide-react";
import { useState } from "react";

import {
  hasCurrentSessionContext,
  useCurrentSessionStore,
} from "../../stores/currentSessionStore";
import "./CurrentSessionCard.css";

const basicTextFields = [
  ["genericClientId", "Generic client identifier", "Session code only—no full names"],
  ["diagnoses", "Diagnoses", "ADHD, anxiety..."],
  ["goals", "Goals", "Rapport, emotion identification..."],
  ["interests", "Interests", "Pokémon, drawing, animals..."],
  ["currentState", "Current state", "Shutting down, restless, anxious..."],
  ["materialsAvailable", "Materials available", "Paper, blocks, cards..."],
];

const advancedTextFields = [
  ["sensoryPreferences", "Sensory preferences"],
  ["communicationStyle", "Communication style"],
  ["regulationStrategies", "Regulation strategies"],
  ["readingTolerance", "Reading tolerance"],
  ["writingTolerance", "Writing tolerance"],
  ["interactionPreference", "Competitive or cooperative preference"],
  ["creativityPreference", "Creativity preference"],
  ["humor", "Humor"],
  ["transitionDifficulty", "Transition difficulty"],
  ["motivators", "Motivators"],
  ["strengths", "Strengths"],
  ["thingsToAvoid", "Things to avoid"],
];

function SessionTextField({ context, field, label, placeholder = "Optional" }) {
  const updateField = useCurrentSessionStore((state) => state.updateField);

  return (
    <label>
      {label}
      <input
        onChange={(event) => updateField(field, event.target.value)}
        placeholder={placeholder}
        type="text"
        value={context[field]}
      />
    </label>
  );
}

export default function CurrentSessionCard() {
  const context = useCurrentSessionStore((state) => state.context);
  const updateField = useCurrentSessionStore((state) => state.updateField);
  const clearContext = useCurrentSessionStore((state) => state.clearContext);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const isActive = hasCurrentSessionContext(context);

  function confirmClear() {
    clearContext();
    setConfirmingClear(false);
  }

  return (
    <section className="session-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Optional context</span>
          <h2>Current Session</h2>
        </div>
        <div className="session-card__status">
          {isActive ? (
            <span className="session-active-indicator">Context active</span>
          ) : null}
          <div className="session-icon">
            <UserRound aria-hidden="true" size={22} />
          </div>
        </div>
      </div>

      <p>
        Add only what is useful right now. This temporary context is not an EHR record and
        is not saved after the app closes. Do not enter full names or detailed
        psychotherapy notes.
      </p>

      <div className="session-fields">
        {basicTextFields.slice(0, 1).map(([field, label, placeholder]) => (
          <SessionTextField
            context={context}
            field={field}
            key={field}
            label={label}
            placeholder={placeholder}
          />
        ))}
        <label>
          Age or age range
          <select
            onChange={(event) => updateField("ageRange", event.target.value)}
            value={context.ageRange}
          >
            <option value="">Select</option>
            <option value="5–7">5–7</option>
            <option value="8–10">8–10</option>
            <option value="11–13">11–13</option>
            <option value="14–17">14–17</option>
          </select>
        </label>
        {basicTextFields.slice(1, 5).map(([field, label, placeholder]) => (
          <SessionTextField
            context={context}
            field={field}
            key={field}
            label={label}
            placeholder={placeholder}
          />
        ))}
        <label>
          Session length
          <select
            onChange={(event) => updateField("sessionLengthMinutes", event.target.value)}
            value={context.sessionLengthMinutes}
          >
            <option value="">Select</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
          </select>
        </label>
        <label>
          Telehealth setting
          <select
            onChange={(event) => updateField("telehealthSetting", event.target.value)}
            value={context.telehealthSetting}
          >
            <option value="">Select</option>
            <option value="telehealth">Telehealth</option>
          </select>
        </label>
        {basicTextFields.slice(5).map(([field, label, placeholder]) => (
          <SessionTextField
            context={context}
            field={field}
            key={field}
            label={label}
            placeholder={placeholder}
          />
        ))}
      </div>

      {showAdvanced ? (
        <div className="session-advanced" id="current-session-advanced">
          <div className="session-fields">
            {advancedTextFields.map(([field, label]) => (
              <SessionTextField
                context={context}
                field={field}
                key={field}
                label={label}
              />
            ))}
            <label className="wide-field">
              Custom notes
              <textarea
                onChange={(event) => updateField("customNotes", event.target.value)}
                placeholder="Brief temporary context only"
                value={context.customNotes}
              />
            </label>
          </div>
        </div>
      ) : null}

      <div className="session-card__actions">
        <button
          aria-controls="current-session-advanced"
          aria-expanded={showAdvanced}
          className="advanced-button"
          onClick={() => setShowAdvanced((current) => !current)}
          type="button"
        >
          {showAdvanced ? (
            <>
              Hide Advanced
              <ChevronUp aria-hidden="true" size={18} />
            </>
          ) : (
            <>
              Show Advanced
              <ChevronDown aria-hidden="true" size={18} />
            </>
          )}
        </button>
        {isActive ? (
          <button
            className="session-clear-button"
            onClick={() => setConfirmingClear(true)}
            type="button"
          >
            <Trash2 aria-hidden="true" size={17} />
            Clear Session
          </button>
        ) : null}
      </div>

      {confirmingClear ? (
        <div className="session-clear-confirmation" role="alert">
          <span>Clear all temporary session context?</span>
          <button onClick={confirmClear} type="button">
            Yes, clear session
          </button>
          <button onClick={() => setConfirmingClear(false)} type="button">
            Cancel
          </button>
        </div>
      ) : null}
    </section>
  );
}
