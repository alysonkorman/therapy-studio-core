import { Archive, ChevronDown, Database, ListMusic } from "lucide-react";
import { useRef, useState } from "react";

import CategoryManager from "./CategoryManager";
import CategoryCreationForm from "./CategoryCreationForm";
import PlaylistManager from "./PlaylistManager";
import PlaylistCreationForm from "./PlaylistCreationForm";

export default function PromptAuthoringPanel({
  authoring,
  onDeckCreated,
  showArchived,
  setShowArchived,
}) {
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState("");
  const [creatingDeck, setCreatingDeck] = useState(false);
  const manageSummaryRef = useRef(null);
  const manageDetailsRef = useRef(null);
  const {
    categories,
    decks,
    error,
    initializing,
    playlists,
    repositories,
    run,
    seed,
    seeded,
    accountSyncStatus,
  } = authoring;

  async function createDeck(event) {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle || creatingDeck) return;
    setCreatingDeck(true);
    try {
      const deck = await run(() =>
        repositories.decks.createPromptDeck({ title: normalizedTitle })
      );
      setTitle("");
      setCreating("");
      onDeckCreated?.(deck);
    } catch {
      // usePromptAuthoring exposes the therapist-facing error while the form stays open.
    } finally {
      setCreatingDeck(false);
    }
  }

  async function setUpAuthoring() {
    const result = await seed();
    if (result) requestAnimationFrame(() => manageSummaryRef.current?.focus());
  }

  if (!seeded) {
    return (
      <section
        aria-labelledby="prompt-authoring-setup-title"
        className="prompt-authoring-setup"
      >
        <div>
          <p className="eyebrow">Make this library your own</p>
          <h2 id="prompt-authoring-setup-title">Set up Prompt Authoring</h2>
          <p>
            Keep browsing normally, or set up editing for all 137 decks and 8,679 prompts.
          </p>
          <ul>
            <li>Edit decks and add prompts</li>
            <li>Organize categories</li>
            <li>Choose colors and icons</li>
            <li>Build playlists</li>
          </ul>
        </div>
        <div className="prompt-authoring-setup__action">
          <button
            aria-describedby="prompt-authoring-setup-status"
            disabled={initializing}
            onClick={() => void setUpAuthoring()}
            type="button"
          >
            <Database aria-hidden="true" size={18} />
            {initializing ? "Setting up Prompt Authoring…" : "Set Up Prompt Authoring"}
          </button>
          <p aria-live="polite" id="prompt-authoring-setup-status">
            {initializing ? "Preparing your editable Prompt Library." : ""}
          </p>
          {error ? (
            <p className="authoring-error" role="alert">
              Setup could not be completed. Your Prompt Library is still available.{" "}
              {error}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="prompt-authoring-tools">
      {accountSyncStatus === "conflict" ? (
        <p className="authoring-error" role="alert">
          This account has a newer Prompt Library change. Your local draft is safe and was
          not uploaded. Conflict review is required before syncing can continue.
        </p>
      ) : null}
      <div className="prompt-authoring-actions" aria-label="Prompt Library authoring">
        <button onClick={() => setCreating("deck")} type="button">
          + New Deck
        </button>
        <button onClick={() => setCreating("category")} type="button">
          + New Category
        </button>
        <button onClick={() => setCreating("playlist")} type="button">
          + New Playlist
        </button>
        <button
          onClick={() => {
            manageDetailsRef.current.open = true;
            manageSummaryRef.current?.focus();
          }}
          type="button"
        >
          Manage Categories
        </button>
        <button
          onClick={() => {
            manageDetailsRef.current.open = true;
            manageSummaryRef.current?.focus();
          }}
          type="button"
        >
          View Playlists
        </button>
      </div>
      {creating === "deck" ? (
        <form
          className="inline-creation-form"
          onSubmit={(event) => void createDeck(event)}
        >
          <h3>New Deck</h3>
          <label>
            Deck Title
            <input
              autoFocus
              disabled={creatingDeck}
              onChange={(event) => setTitle(event.target.value)}
              required
              value={title}
            />
          </label>
          <div className="authoring-actions">
            <button
              className="button-primary"
              disabled={!title.trim() || creatingDeck}
              type="submit"
            >
              {creatingDeck ? "Saving Deck…" : "Save Deck"}
            </button>
            <button disabled={creatingDeck} onClick={() => setCreating("")} type="button">
              Cancel
            </button>
          </div>
        </form>
      ) : null}
      {creating === "category" ? (
        <CategoryCreationForm
          onCancel={() => setCreating("")}
          onCreate={async (input) => {
            await run(() => repositories.categories.createCategory(input));
            setCreating("");
          }}
        />
      ) : null}
      {creating === "playlist" ? (
        <PlaylistCreationForm
          onCancel={() => setCreating("")}
          onCreate={async (input) => {
            await run(() => repositories.playlists.createPlaylist(input));
            setCreating("");
          }}
        />
      ) : null}
      <details className="prompt-authoring-panel" ref={manageDetailsRef}>
        <summary ref={manageSummaryRef}>
          <ChevronDown aria-hidden="true" size={18} />
          Manage Prompt Library
        </summary>
        <label className="toggle-control">
          <input
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
            type="checkbox"
          />
          <Archive aria-hidden="true" size={18} />
          Show archived content
        </label>
        <CategoryManager
          categories={categories}
          repository={repositories.categories}
          run={run}
        />
        <div className="authoring-divider">
          <ListMusic aria-hidden="true" size={18} />
          Playlists
        </div>
        <PlaylistManager
          decks={decks}
          playlists={playlists}
          repository={repositories.playlists}
          run={run}
        />
      </details>
    </section>
  );
}
