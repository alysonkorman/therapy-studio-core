import { useCallback, useEffect, useState } from "react";

import { promptDecks as importedPromptDecks } from "../../data/resources";
import {
  categoryRepository,
  playlistRepository,
  promptDeckRepository,
} from "../../lib/data";
import { promptCategoryIdForName } from "../../models/promptAuthoring";

function importedCategories(decks) {
  const seen = new Set();
  return decks.flatMap((deck) => {
    if (!deck.category || seen.has(deck.categoryId)) return [];
    seen.add(deck.categoryId);
    return [
      {
        id: deck.categoryId ?? promptCategoryIdForName(deck.category),
        name: deck.category,
        color: deck.color,
        iconId: deck.iconId,
        sortOrder: seen.size - 1,
        archived: false,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
      },
    ];
  });
}

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

export function usePromptAuthoring({ enabled = true, repositories = {} } = {}) {
  const deckRepository = repositories.decks ?? promptDeckRepository;
  const categoriesRepository = repositories.categories ?? categoryRepository;
  const playlistsRepository = repositories.playlists ?? playlistRepository;
  const [state, setState] = useState({
    decks: importedPromptDecks,
    categories: [],
    playlists: [],
    seeded: false,
    loading: enabled,
    initializing: false,
    error: "",
  });

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const [decks, categories, playlists] = await Promise.all([
        deckRepository.getAllPromptDecks({ includeArchived: true }),
        categoriesRepository.getAllCategories({ includeArchived: true }),
        playlistsRepository.getAllPlaylists({ includeArchived: true }),
      ]);
      setState({
        decks: decks.length ? decks : importedPromptDecks,
        categories,
        playlists,
        seeded: decks.length > 0,
        loading: false,
        initializing: false,
        error: "",
      });
      return decks.length > 0;
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

  async function seed() {
    setState((current) => ({ ...current, initializing: true, error: "" }));
    try {
      const deckResult =
        await deckRepository.seedImportedPromptDecks(importedPromptDecks);
      const categoryResult = await categoriesRepository.seedCategories(
        importedCategories(importedPromptDecks)
      );
      const ready = await refresh();
      return ready ? { decks: deckResult, categories: categoryResult } : null;
    } catch (error) {
      setState((current) => ({
        ...current,
        initializing: false,
        error: authoringMessage(error),
      }));
      return null;
    }
  }

  return {
    ...state,
    refresh,
    seed,
    run,
    repositories: {
      decks: deckRepository,
      categories: categoriesRepository,
      playlists: playlistsRepository,
    },
  };
}
