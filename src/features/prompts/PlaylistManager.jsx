import { ArrowDown, ArrowUp, Copy, Trash2 } from "lucide-react";
import { useState } from "react";

import { IconRenderer } from "../icons";
import InlineEdit from "./InlineEdit";
import formatPromptDisplayLabel from "./formatPromptDisplayLabel";
import { promptAccentStyle } from "./promptAppearance";

export default function PlaylistManager({ playlists, decks, repository, run }) {
  const [openId, setOpenId] = useState("");
  const [position, setPosition] = useState(0);
  const open = playlists.find(({ id }) => id === openId);

  async function moveItem(playlist, index, offset) {
    const ids = playlist.items.map(({ id }) => id);
    const target = index + offset;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await run(() => repository.reorderPlaylistItems(playlist.id, ids));
  }

  function itemLabel(item) {
    const deck = decks.find(({ id }) => id === item.deckId);
    if (item.type === "prompt-deck") return deck?.title ?? "Missing deck";
    return deck?.prompts.find(({ id }) => id === item.promptId)?.text ?? "Missing prompt";
  }

  function itemIdentity(item) {
    const itemDeck = decks.find(({ id }) => id === item.deckId);
    return item.type === "prompt-deck" && itemDeck ? (
      <span className="playlist-deck-identity" style={promptAccentStyle(itemDeck.color)}>
        <span className="prompt-identity-icon-tile">
          <IconRenderer iconId={itemDeck.iconId} size={28} />
        </span>
        {itemDeck.title}
      </span>
    ) : (
      <span>{itemLabel(item)}</span>
    );
  }

  return (
    <section className="authoring-manager">
      <h2>Playlists</h2>
      {playlists.map((playlist) => (
        <article className="playlist-card" key={playlist.id}>
          <InlineEdit
            label="playlist title"
            displayValue={formatPromptDisplayLabel(playlist.title)}
            onSave={(value) =>
              run(() => repository.updatePlaylist(playlist.id, { title: value }))
            }
            value={playlist.title}
          />
          <p>{playlist.description || "No description"}</p>
          <label>
            Add Deck
            <select
              defaultValue=""
              onChange={(event) => {
                if (event.target.value)
                  void run(() =>
                    repository.addPlaylistItem(playlist.id, {
                      type: "prompt-deck",
                      deckId: event.target.value,
                    })
                  );
                event.target.value = "";
              }}
            >
              <option value="">Choose a Deck</option>
              {decks
                .filter((deck) => !deck.archived)
                .map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.title}
                  </option>
                ))}
            </select>
          </label>
          <ol className="authoring-list">
            {playlist.items.map((item, index) => (
              <li key={item.id}>
                {itemIdentity(item)}
                <div className="authoring-actions">
                  <button
                    disabled={index === 0}
                    onClick={() => void moveItem(playlist, index, -1)}
                    type="button"
                  >
                    <ArrowUp aria-hidden="true" size={16} />
                    Move Up
                  </button>
                  <button
                    disabled={index === playlist.items.length - 1}
                    onClick={() => void moveItem(playlist, index, 1)}
                    type="button"
                  >
                    <ArrowDown aria-hidden="true" size={16} />
                    Move Down
                  </button>
                  <button
                    onClick={() =>
                      void run(() => repository.removePlaylistItem(playlist.id, item.id))
                    }
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <div className="authoring-actions">
            <button
              disabled={!playlist.items.length}
              onClick={() => {
                setOpenId(playlist.id);
                setPosition(0);
              }}
              type="button"
            >
              Open Playlist
            </button>
            <button
              onClick={() => void run(() => repository.duplicatePlaylist(playlist.id))}
              type="button"
            >
              <Copy aria-hidden="true" size={16} />
              Duplicate
            </button>
            <button
              onClick={() =>
                void run(() =>
                  playlist.archived
                    ? repository.restorePlaylist(playlist.id)
                    : repository.archivePlaylist(playlist.id)
                )
              }
              type="button"
            >
              {playlist.archived ? "Restore" : "Archive"}
            </button>
          </div>
        </article>
      ))}
      {open ? (
        <section className="playlist-player">
          <h3>{open.title}</h3>
          {open.items.length ? (
            <>
              <p>{itemLabel(open.items[position])}</p>
              <span>
                {position + 1} of {open.items.length}
              </span>
              <div className="authoring-actions">
                <button
                  disabled={position === 0}
                  onClick={() => setPosition((value) => value - 1)}
                  type="button"
                >
                  Previous
                </button>
                <button
                  disabled={position === open.items.length - 1}
                  onClick={() => setPosition((value) => value + 1)}
                  type="button"
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <p>This playlist is empty.</p>
          )}
        </section>
      ) : null}
    </section>
  );
}
