import { useState } from "react";

export default function PlaylistCreationForm({ onCancel, onCreate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await onCreate({ title, description });
      setTitle("");
      setDescription("");
    } catch (createError) {
      setError(createError.message);
    }
  }

  return (
    <form className="inline-creation-form" onSubmit={(event) => void submit(event)}>
      <h3>New Playlist</h3>
      <label>
        Playlist Title
        <input
          autoFocus
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
      </label>
      <label>
        Description (optional)
        <textarea
          onChange={(event) => setDescription(event.target.value)}
          value={description}
        />
      </label>
      {error ? (
        <p className="authoring-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="authoring-actions">
        <button className="button-primary" disabled={!title.trim()} type="submit">
          Save Playlist
        </button>
        <button onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </form>
  );
}
