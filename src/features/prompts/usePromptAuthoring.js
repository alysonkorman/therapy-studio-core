import { useCallback, useEffect, useState } from "react";

import {
  categoryRepository,
  playlistRepository,
  promptDeckRepository,
} from "../../lib/data";

function authoringMessage(error) {
  if (error?.code === "duplicate-authoring-record") {
    return "That item already exists. Please choose a different name.";
  }
  if (error?.code === "invalid-authoring-input") {
    return "Please check the information and try again.";
  }
  if (
    error?.code === "authoring-record-not-found" ||
    error?.code === "invalid-authoring-reference"
  ) {
    return "That Prompt Library item is no longer available.";
  }
  return "Prompt Authoring is unavailable right now. Please try again.";
}

// A completed library reset is a display boundary, not permission for a
// background reconciliation to destroy records that are absent from a cloud
// response. The explicit reset operation remains the only destructive path.
export function filterPromptDecksForCompletedReset(decks, reset) {
  // A reset marker only coordinates account cleanup. It must never make stored
  // therapist/imported decks disappear just because their original timestamp is older.
  return decks;
}

export function usePromptAuthoring({ enabled = true, repositories = {} } = {}) {
  const deckRepository = repositories.decks ?? promptDeckRepository;
  const categoriesRepository = repositories.categories ?? categoryRepository;
  const playlistsRepository = repositories.playlists ?? playlistRepository;
  const [state, setState] = useState({
    decks: [],
    categories: [],
    playlists: [],
    seeded: true,
    loading: enabled,
    initializing: false,
    error: "",
    accountSyncStatus: "local-only",
    deckSyncRecords: new Map(),
    promptAuthoringAcknowledgmentVersion: null,
    promptLibraryReset: null,
  });

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const syncResult = await deckRepository.reconcileAccountData?.();
      const promptLibraryReset =
        (await deckRepository.getPromptLibraryReset?.({ completedOnly: true })) ?? null;
      const [decks, categories, playlists, acknowledgmentVersion, deckSyncRecords] =
        await Promise.all([
          deckRepository.getAllPromptDecks({ includeArchived: true }),
          categoriesRepository.getAllCategories({ includeArchived: true }),
          playlistsRepository.getAllPlaylists({ includeArchived: true }),
          deckRepository.getPromptAuthoringAcknowledgment?.() ?? null,
          deckRepository.getPromptDeckSyncRecords?.() ?? new Map(),
        ]);
      const visibleDecks = filterPromptDecksForCompletedReset(decks, promptLibraryReset);
      setState({
        decks: visibleDecks,
        categories,
        playlists,
        seeded: true,
        loading: false,
        initializing: false,
        error: "",
        accountSyncStatus: syncResult?.status ?? "local-only",
        deckSyncRecords,
        promptAuthoringAcknowledgmentVersion: acknowledgmentVersion,
        promptLibraryReset,
      });
      return true;
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: authoringMessage(error),
      }));
      return false;
    }
  }, [categoriesRepository, deckRepository, enabled, playlistsRepository]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function run(operation) {
    try {
      const result = await operation();
      await refresh();
      return result;
    } catch (error) {
      const message = authoringMessage(error);
      setState((current) => ({ ...current, error: message }));
      throw new Error(message, { cause: error });
    }
  }

  return {
    ...state,
    refresh,
    run,
    repositories: {
      decks: deckRepository,
      categories: categoriesRepository,
      playlists: playlistsRepository,
    },
  };
}
