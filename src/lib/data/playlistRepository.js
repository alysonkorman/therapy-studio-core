import { nanoid } from "nanoid";

import { playlistItemSchema, promptPlaylistSchema } from "../../models/promptAuthoring";
import { getTherapyStudioDatabase } from "./database";
import {
  assertOnlyFields,
  assertUniqueIds,
  authoringError,
  authoringErrorCodes,
  ensureAuthoringDatabaseOpen,
  rethrowAuthoringError,
  sortedByOrder,
} from "./promptAuthoringRepositoryUtils";

const editableFields = ["title", "description"];

function parsePlaylist(input) {
  const result = promptPlaylistSchema.safeParse(input);
  if (!result.success) {
    throw authoringError(authoringErrorCodes.invalidInput, "Playlist is invalid.", {
      cause: result.error,
      details: result.error.issues,
    });
  }
  return result.data;
}

export function createPlaylistRepository({
  database = getTherapyStudioDatabase(),
  now = () => new Date().toISOString(),
  createId = () => nanoid(),
} = {}) {
  async function readAll() {
    await ensureAuthoringDatabaseOpen(database);
    return (await database.table("playlists").toArray()).map(parsePlaylist);
  }

  async function getAllPlaylists({ includeArchived = false } = {}) {
    return sortedByOrder(
      (await readAll()).filter((playlist) => includeArchived || !playlist.archived)
    );
  }

  async function getPlaylistById(id) {
    await ensureAuthoringDatabaseOpen(database);
    const value = await database.table("playlists").get(id);
    if (!value)
      throw authoringError(authoringErrorCodes.notFound, `Playlist not found: ${id}`);
    return parsePlaylist(value);
  }

  async function saveMutation(id, mutation, message) {
    await ensureAuthoringDatabaseOpen(database);
    try {
      return await database.transaction(
        "rw",
        [database.table("playlists"), database.table("resources")],
        async () => {
          const current = await getPlaylistById(id);
          const changed = await mutation(current);
          const updated = parsePlaylist({ ...changed, updatedAt: now() });
          await database.table("playlists").put(updated);
          return updated;
        }
      );
    } catch (error) {
      rethrowAuthoringError(error, authoringErrorCodes.transactionFailed, message);
    }
  }

  async function createPlaylist(input) {
    assertOnlyFields(input, editableFields);
    const timestamp = now();
    const playlist = parsePlaylist({
      id: createId(),
      title: input.title,
      description: input.description ?? "",
      items: [],
      sortOrder: (await readAll()).length,
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await database.table("playlists").add(playlist);
    return playlist;
  }

  function updatePlaylist(id, changes) {
    assertOnlyFields(changes, editableFields);
    return saveMutation(
      id,
      (current) => ({ ...current, ...changes }),
      "Playlist could not be updated."
    );
  }

  async function duplicatePlaylist(id) {
    const source = await getPlaylistById(id);
    const timestamp = now();
    const duplicate = parsePlaylist({
      ...source,
      id: createId(),
      title: `${source.title} Copy`,
      sortOrder: (await readAll()).length,
      items: source.items.map((item, sortOrder) => ({
        ...item,
        id: createId(),
        sortOrder,
      })),
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await database.table("playlists").add(duplicate);
    return duplicate;
  }

  async function validateReference(item) {
    const resource = await database.table("resources").get(item.deckId);
    if (!resource || resource.type !== "prompt-deck") {
      throw authoringError(
        authoringErrorCodes.invalidReference,
        `Prompt Deck not found: ${item.deckId}`
      );
    }
    if (
      item.type === "prompt-item" &&
      !resource.prompts.some(({ id }) => id === item.promptId)
    ) {
      throw authoringError(
        authoringErrorCodes.invalidReference,
        `Prompt not found: ${item.promptId}`
      );
    }
  }

  function addPlaylistItem(playlistId, input) {
    return saveMutation(
      playlistId,
      async (current) => {
        const item = playlistItemSchema.parse({
          ...input,
          id: createId(),
          sortOrder: current.items.length,
        });
        await validateReference(item);
        return { ...current, items: [...current.items, item] };
      },
      "Playlist item could not be added."
    );
  }

  function removePlaylistItem(playlistId, itemId) {
    return saveMutation(
      playlistId,
      (current) => {
        if (!current.items.some(({ id }) => id === itemId)) {
          throw authoringError(
            authoringErrorCodes.notFound,
            `Playlist item not found: ${itemId}`
          );
        }
        return {
          ...current,
          items: current.items
            .filter(({ id }) => id !== itemId)
            .map((item, sortOrder) => ({ ...item, sortOrder })),
        };
      },
      "Playlist item could not be removed."
    );
  }

  function reorderPlaylistItems(playlistId, orderedItemIds) {
    return saveMutation(
      playlistId,
      (current) => {
        assertUniqueIds(
          orderedItemIds,
          current.items.map(({ id }) => id)
        );
        const items = new Map(current.items.map((item) => [item.id, item]));
        return {
          ...current,
          items: orderedItemIds.map((id, sortOrder) => ({ ...items.get(id), sortOrder })),
        };
      },
      "Playlist order could not be saved."
    );
  }

  async function setArchived(id, archived) {
    return saveMutation(
      id,
      (current) => ({ ...current, archived }),
      "Playlist archive status could not be saved."
    );
  }

  return {
    getAllPlaylists,
    getPlaylistById,
    createPlaylist,
    updatePlaylist,
    duplicatePlaylist,
    addPlaylistItem,
    removePlaylistItem,
    reorderPlaylistItems,
    archivePlaylist: (id) => setArchived(id, true),
    restorePlaylist: (id) => setArchived(id, false),
  };
}

export const playlistRepository = createPlaylistRepository();
