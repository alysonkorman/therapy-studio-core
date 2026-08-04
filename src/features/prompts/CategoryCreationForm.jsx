import { useState } from "react";

import { IconBrowserField } from "../icons";
import PromptColorPicker from "./PromptColorPicker";

export default function CategoryCreationForm({ onCancel, onCreate }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6C46C3");
  const [iconId, setIconId] = useState("prompt-default");
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    try {
      await onCreate({ name, color, iconId });
      setName("");
    } catch (createError) {
      setError(createError.message);
    }
  }

  return (
    <section className="inline-creation-form">
      <h3>New Category</h3>
      <label>
        Category Name
        <input autoFocus onChange={(event) => setName(event.target.value)} value={name} />
      </label>
      <PromptColorPicker label="Category Color" onSave={setColor} value={color} />
      <IconBrowserField label="Category Icon" onSave={setIconId} value={iconId} />
      {error ? (
        <p className="authoring-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="authoring-actions">
        <button
          className="button-primary"
          disabled={!name.trim()}
          onClick={() => void submit()}
          type="button"
        >
          Save Category
        </button>
        <button onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </section>
  );
}
