import { Archive, ChevronDown, ListMusic } from "lucide-react";
import { useRef, useState } from "react";

import CategoryManager from "./CategoryManager";
import CategoryCreationForm from "./CategoryCreationForm";
import PlaylistManager from "./PlaylistManager";
import PlaylistCreationForm from "./PlaylistCreationForm";
import PromptLibraryResetPanel from "./PromptLibraryResetPanel";
import PromptLibraryExportPanel from "./PromptLibraryExportPanel";
import PromptLibraryRestorePreviewPanel from "./PromptLibraryRestorePreviewPanel";

export default function PromptAuthoringPanel({
  authoring,
  onDeckCreated,
  showArchived,
  setShowArchived,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [bulkPrompts, setBulkPrompts] = useState("");
  const [creating, setCreating] = useState("");
  const [creatingDeck, setCreatingDeck] = useState(false);
  const manageSummaryRef = useRef(null);
  const manageDetailsRef = useRef(null);
  const { categories, decks, playlists, repositories, run, accountSyncStatus } =
    authoring;

  async function createDeck(event) {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle || creatingDeck) return;
    setCreatingDeck(true);
    try {
      const selectedCategory = categories.find((category) => category.id === categoryId);
      const deck = await run(() =>
        repositories.decks.createPromptDeck({
          title: normalizedTitle,
          description: description.trim(),
          category: selectedCategory?.name ?? "",
          categoryId: selectedCategory?.id ?? null,
        })
      );
      const promptTexts = bulkPrompts
        .split(/\r?\n/)
        .map((prompt) => prompt.trim())
        .filter(Boolean);
      if (promptTexts.length) {
        await run(() => repositories.decks.bulkAddPrompts(deck.id, promptTexts));
      }
      setTitle("");
      setDescription("");
      setCategoryId("");
      setBulkPrompts("");
      setCreating("");
      onDeckCreated?.(deck);
    } catch {
      // usePromptAuthoring exposes the therapist-facing error while the form stays open.
    } finally {
      setCreatingDeck(false);
    }
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
      <PromptLibraryExportPanel decks={decks} repository={repositories.decks} />
      <PromptLibraryRestorePreviewPanel />
      <PromptLibraryResetPanel authoring={authoring} />
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
          <label>
            Description
            <textarea
              disabled={creatingDeck}
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>
          <label>
            Category
            <select
              disabled={creatingDeck}
              onChange={(event) => setCategoryId(event.target.value)}
              value={categoryId}
            >
              <option value="">No category yet</option>
              {categories
                .filter((category) => !category.archived)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Add prompts now (one per line)
            <textarea
              disabled={creatingDeck}
              onChange={(event) => setBulkPrompts(event.target.value)}
              placeholder="Paste one prompt on each line"
              value={bulkPrompts}
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
          showArchived={showArchived}
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
