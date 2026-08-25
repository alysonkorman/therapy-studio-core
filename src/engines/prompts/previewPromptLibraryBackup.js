import { PROMPT_LIBRARY_RECOVERY_FORMAT } from "./promptLibraryRecovery";
import { PROMPT_LIBRARY_STORED_RECORDS_EXPORT_FORMAT } from "./promptLibraryStoredRecordsExport";

function assertArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be a list.`);
  return value;
}

function assertUniqueIds(records, label) {
  const ids = new Set();
  for (const record of records) {
    if (
      !record ||
      typeof record !== "object" ||
      typeof record.id !== "string" ||
      !record.id
    ) {
      throw new Error(`Every ${label} record must have an ID.`);
    }
    if (ids.has(record.id))
      throw new Error(`The backup has duplicate ${label} ID: ${record.id}.`);
    ids.add(record.id);
  }
  return ids;
}

function validateDecks(records) {
  const decks = assertArray(records, "Prompt decks");
  const ids = assertUniqueIds(decks, "Prompt deck");
  let prompts = 0;
  const allPromptIds = new Set();

  for (const deck of decks) {
    if (deck.type !== "prompt-deck") {
      throw new Error(`Prompt deck ${deck.id} is not a prompt-deck record.`);
    }
    const deckPrompts = assertArray(deck.prompts, `Prompts in deck ${deck.id}`);
    const promptIds = new Set();
    for (const prompt of deckPrompts) {
      if (
        !prompt ||
        typeof prompt !== "object" ||
        typeof prompt.id !== "string" ||
        !prompt.id
      ) {
        throw new Error(`Every prompt in deck ${deck.id} must have an ID.`);
      }
      if (promptIds.has(prompt.id)) {
        throw new Error(`Deck ${deck.id} has duplicate prompt ID: ${prompt.id}.`);
      }
      if (allPromptIds.has(prompt.id)) {
        throw new Error(`The backup has duplicate prompt ID: ${prompt.id}.`);
      }
      promptIds.add(prompt.id);
      allPromptIds.add(prompt.id);
    }
    prompts += deckPrompts.length;
  }

  return { decks: decks.length, deckIds: ids, promptIds: allPromptIds, prompts };
}

function validateCategoryReferences(decks, categoryIds) {
  for (const deck of decks) {
    if (deck.categoryId != null && !categoryIds.has(deck.categoryId)) {
      throw new Error(
        `Deck ${deck.id} references a category that is not in this backup.`
      );
    }
  }
}

function storedRecordsPreview(backup) {
  if (backup.version !== 1 || !backup.records || typeof backup.records !== "object") {
    throw new Error("This stored-record backup has an unsupported format version.");
  }
  const categories = assertArray(backup.records.categories, "Categories");
  const playlists = assertArray(backup.records.playlists, "Playlists");
  const decks = assertArray(backup.records.promptDecks, "Prompt decks");
  const categoryIds = assertUniqueIds(categories, "category");
  assertUniqueIds(playlists, "playlist");
  const summary = validateDecks(decks);
  validateCategoryReferences(decks, categoryIds);

  if (backup.summary?.serializationFailures?.length) {
    throw new Error("This backup reports records that could not be serialized.");
  }
  if (backup.summary?.missingVisibleDeckIds?.length) {
    throw new Error("This backup is missing one or more visible Prompt decks.");
  }

  return {
    exportedAt: backup.exportedAt ?? null,
    format: "stored records",
    restoreEligible: true,
    summary: {
      categories: categories.length,
      decks: summary.decks,
      playlists: playlists.length,
      prompts: summary.prompts,
    },
  };
}

function recoverySnapshotPreview(backup) {
  if (backup.version !== 2) {
    throw new Error("This recovery backup has an unsupported format version.");
  }
  const categories = assertArray(backup.categories, "Categories");
  const wrappedDecks = assertArray(backup.decks, "Prompt decks");
  const decks = wrappedDecks.map((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      !entry.resource ||
      typeof entry.resource !== "object"
    ) {
      throw new Error("Every recovery Prompt deck must include its stored resource.");
    }
    return entry.resource;
  });
  const categoryIds = assertUniqueIds(categories, "category");
  const summary = validateDecks(decks);
  validateCategoryReferences(decks, categoryIds);
  const references = assertArray(backup.playlistReferences ?? [], "Playlist references");
  const playlistCount = new Set(
    references.map((reference) => reference?.playlistId).filter(Boolean)
  ).size;

  return {
    exportedAt: backup.exportedAt ?? null,
    format: "recovery snapshot",
    restoreEligible: playlistCount === 0,
    summary: {
      categories: categories.length,
      playlists: playlistCount,
      decks: summary.decks,
      prompts: summary.prompts,
    },
    warning:
      playlistCount > 0
        ? "This older recovery snapshot stores playlist references, not complete playlist records and cannot be restored safely."
        : "This backup contains no playlists and can be restored into an empty local Prompt Library.",
  };
}

export function previewPromptLibraryBackup(backup) {
  if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
    throw new Error("Choose a Prompt Library JSON backup.");
  }
  if (backup.format === PROMPT_LIBRARY_STORED_RECORDS_EXPORT_FORMAT) {
    return storedRecordsPreview(backup);
  }
  if (backup.format === PROMPT_LIBRARY_RECOVERY_FORMAT) {
    return recoverySnapshotPreview(backup);
  }
  throw new Error("This is not a recognized Prompt Library backup.");
}

export function previewPromptLibraryBackupJson(text) {
  try {
    return previewPromptLibraryBackup(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error("The selected file is not valid JSON.", { cause: error });
    throw error;
  }
}
