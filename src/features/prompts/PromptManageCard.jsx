import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Copy, Trash2 } from "lucide-react";
import { useState } from "react";

import { IconBrowserField } from "../icons";
import InlineEdit from "./InlineEdit";
import formatPromptDisplayLabel from "./formatPromptDisplayLabel";
import MetadataEditor from "./MetadataEditor";
import PlaylistCreationForm from "./PlaylistCreationForm";
import PromptVisual from "./PromptVisual";

function validPromptColor(color) {
  return typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color) ? color : null;
}

export default function PromptManageCard({
  deck,
  decks,
  index,
  playlists,
  prompt,
  repositories,
  run,
  onMove,
}) {
  const [expanded, setExpanded] = useState(false);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const accent = validPromptColor(prompt.color);
  const optionsId = `prompt-options-${prompt.id}`;

  return (
    <li className="prompt-manage-card">
      <div className="prompt-manage-card__header">
        <div className="prompt-manage-card__identity">
          <PromptVisual
            className="prompt-manage-card__visual"
            deck={deck}
            prompt={prompt}
            size={28}
          />
          {accent ? (
            <span
              aria-label={`Prompt color ${accent}`}
              className="prompt-manage-card__accent"
              style={{ backgroundColor: accent }}
            />
          ) : null}
          <InlineEdit
            className="prompt-manage-card__text"
            contentAsEditControl
            label="prompt text"
            multiline
            onSave={(text) =>
              run(() => repositories.decks.updatePrompt(deck.id, prompt.id, { text }))
            }
            value={prompt.text}
          />
        </div>
        <button
          aria-controls={optionsId}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Hide" : "Show"} options for ${prompt.text}`}
          className="prompt-manage-card__toggle"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? "Less" : "More"}
          {expanded ? (
            <ChevronUp aria-hidden="true" size={17} />
          ) : (
            <ChevronDown aria-hidden="true" size={17} />
          )}
        </button>
      </div>

      <div className="prompt-manage-card__options" hidden={!expanded} id={optionsId}>
        <section
          aria-labelledby={`prompt-visual-${prompt.id}`}
          className="prompt-manage-card__visual-editor"
        >
          <div>
            <h3 id={`prompt-visual-${prompt.id}`}>Card Visual</h3>
            <p>{prompt.iconId ? "Using a card override" : "Using the deck visual"}</p>
          </div>
          <IconBrowserField
            actionLabel={prompt.iconId ? "Change SVG" : "Choose SVG"}
            label={`Card Visual for ${prompt.text}`}
            onSave={(iconId) =>
              run(() => repositories.decks.updatePrompt(deck.id, prompt.id, { iconId }))
            }
            value={prompt.iconId ?? deck.iconId}
          />
          {prompt.iconId ? (
            <button
              onClick={() =>
                void run(() =>
                  repositories.decks.updatePrompt(deck.id, prompt.id, { iconId: null })
                )
              }
              type="button"
            >
              Use Deck Visual
            </button>
          ) : null}
        </section>
        <MetadataEditor
          onSave={(changes) =>
            run(() => repositories.decks.updatePrompt(deck.id, prompt.id, changes))
          }
          value={prompt}
        />
        <section
          aria-labelledby={`prompt-actions-${prompt.id}`}
          className="prompt-manage-card__actions"
        >
          <h3 id={`prompt-actions-${prompt.id}`}>Organization and Actions</h3>
          <div className="authoring-actions">
            <button
              disabled={index === 0}
              onClick={() => void onMove(index, -1)}
              type="button"
            >
              <ArrowUp aria-hidden="true" size={16} />
              Move Up
            </button>
            <button
              disabled={index === deck.prompts.length - 1}
              onClick={() => void onMove(index, 1)}
              type="button"
            >
              <ArrowDown aria-hidden="true" size={16} />
              Move Down
            </button>
            <button
              onClick={() =>
                void run(() => repositories.decks.duplicatePrompt(deck.id, prompt.id))
              }
              type="button"
            >
              <Copy aria-hidden="true" size={16} />
              Duplicate
            </button>
            <label>
              Move To
              <select
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value)
                    void run(() =>
                      repositories.decks.movePrompt(
                        deck.id,
                        prompt.id,
                        event.target.value
                      )
                    );
                  event.target.value = "";
                }}
              >
                <option value="">Choose Deck</option>
                {decks
                  .filter((item) => item.id !== deck.id && !item.archived)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Copy To
              <select
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value)
                    void run(() =>
                      repositories.decks.copyPrompt(
                        deck.id,
                        prompt.id,
                        event.target.value
                      )
                    );
                  event.target.value = "";
                }}
              >
                <option value="">Choose Deck</option>
                {decks
                  .filter((item) => !item.archived)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Add To Playlist
              <select
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value === "__new__") {
                    setCreatingPlaylist(true);
                    event.target.value = "";
                    return;
                  }
                  if (event.target.value)
                    void run(() =>
                      repositories.playlists.addPlaylistItem(event.target.value, {
                        type: "prompt-item",
                        deckId: deck.id,
                        promptId: prompt.id,
                      })
                    );
                  event.target.value = "";
                }}
              >
                <option value="">Choose Playlist</option>
                {playlists
                  .filter((item) => !item.archived)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {formatPromptDisplayLabel(item.title)}
                    </option>
                  ))}
                <option value="__new__">+ Create New Playlist</option>
              </select>
            </label>
            {creatingPlaylist ? (
              <PlaylistCreationForm
                onCancel={() => setCreatingPlaylist(false)}
                onCreate={async (input) => {
                  const playlist = await run(() =>
                    repositories.playlists.createPlaylist(input)
                  );
                  await run(() =>
                    repositories.playlists.addPlaylistItem(playlist.id, {
                      type: "prompt-item",
                      deckId: deck.id,
                      promptId: prompt.id,
                    })
                  );
                  setCreatingPlaylist(false);
                }}
              />
            ) : null}
            <button
              className="button-destructive"
              onClick={() => {
                if (window.confirm("Delete this prompt?"))
                  void run(() => repositories.decks.deletePrompt(deck.id, prompt.id));
              }}
              type="button"
            >
              <Trash2 aria-hidden="true" size={16} />
              Delete
            </button>
          </div>
        </section>
      </div>
    </li>
  );
}
