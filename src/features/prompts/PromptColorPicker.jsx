import { useRef, useState } from "react";

import {
  DEFAULT_PROMPT_COLOR,
  normalizePromptColor,
  PROMPT_COLORS,
} from "./promptAppearance";

export default function PromptColorPicker({
  defaultColor = DEFAULT_PROMPT_COLOR,
  label,
  onPreview,
  onSave,
  value,
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState("");
  const saveVersion = useRef(0);

  async function save(candidate) {
    const version = saveVersion.current + 1;
    saveVersion.current = version;
    const normalized = normalizePromptColor(candidate);
    if (!normalized) {
      setError("Enter a six-digit hexadecimal color, such as #6C46C3.");
      return false;
    }
    setDraft(normalized);
    onPreview?.(normalized);
    try {
      await onSave(normalized);
      if (saveVersion.current === version) setError("");
      return true;
    } catch {
      if (saveVersion.current === version)
        setError("That color could not be saved. Please try again.");
      return false;
    }
  }

  return (
    <fieldset className="prompt-color-picker">
      <legend>{label}</legend>
      <span className="prompt-control-kicker">Preset Colors</span>
      <div className="prompt-color-picker__presets" aria-label={`${label} presets`}>
        {PROMPT_COLORS.map((color) => (
          <button
            aria-label={`Use ${color} for ${label}`}
            aria-pressed={value.toUpperCase() === color}
            className="prompt-color-picker__preset"
            data-color={color}
            key={color}
            onClick={() => void save(color)}
            type="button"
          >
            <span aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className="prompt-color-picker__custom">
        <label>
          Custom
          <input
            aria-label={`${label} full color picker`}
            onChange={(event) => {
              setDraft(event.target.value.toUpperCase());
              onPreview?.(event.target.value.toUpperCase());
              void save(event.target.value);
            }}
            type="color"
            value={normalizePromptColor(draft) ?? DEFAULT_PROMPT_COLOR}
          />
        </label>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save(draft);
          }}
        >
          <label>
            Hex
            <input
              aria-label="Hex Color"
              aria-invalid={Boolean(error)}
              maxLength={7}
              onChange={(event) => {
                setDraft(event.target.value);
                const normalized = normalizePromptColor(event.target.value);
                if (normalized) onPreview?.(normalized);
              }}
              spellCheck="false"
              value={draft}
            />
          </label>
          <button aria-label="Apply Color" className="button-primary" type="submit">
            Apply
          </button>
        </form>
        <p className="prompt-color-picker__current">Selected Color: {value}</p>
        <button onClick={() => void save(defaultColor)} type="button">
          Reset to Default
        </button>
      </div>
      {error ? (
        <p className="authoring-error" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
