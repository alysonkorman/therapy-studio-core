export const PROMPT_LIBRARY_STORED_RECORDS_EXPORT_FORMAT =
  "therapy-studio-prompt-library-stored-records";

function serializableRecord(store, record) {
  try {
    return { record: JSON.parse(JSON.stringify(record)), failure: null };
  } catch (error) {
    return {
      record: null,
      failure: {
        id: typeof record?.id === "string" ? record.id : null,
        reason: error instanceof Error ? error.message : "record is not serializable",
        store,
      },
    };
  }
}

function serializableRecords(store, records) {
  const parsed = records.map((record) => serializableRecord(store, record));
  return {
    failures: parsed.flatMap((result) => (result.failure ? [result.failure] : [])),
    records: parsed.flatMap((result) => (result.record ? [result.record] : [])),
  };
}

export function createPromptLibraryStoredRecordsExport({
  categories,
  exportedAt,
  playlists,
  resources,
  visibleDeckIds = [],
}) {
  const promptDeckRecords = resources.filter((record) => record?.type === "prompt-deck");
  const exportedDecks = serializableRecords("resources", promptDeckRecords);
  const exportedCategories = serializableRecords("categories", categories);
  const exportedPlaylists = serializableRecords("playlists", playlists);
  const exportedDeckIds = new Set(exportedDecks.records.map(({ id }) => id));
  const missingVisibleDeckIds = visibleDeckIds.filter((id) => !exportedDeckIds.has(id));
  const snapshot = {
    exportedAt,
    format: PROMPT_LIBRARY_STORED_RECORDS_EXPORT_FORMAT,
    records: {
      categories: exportedCategories.records,
      playlists: exportedPlaylists.records,
      promptDecks: exportedDecks.records,
    },
    summary: {
      categories: exportedCategories.records.length,
      decks: exportedDecks.records.length,
      missingVisibleDeckIds,
      playlists: exportedPlaylists.records.length,
      prompts: exportedDecks.records.reduce(
        (total, deck) => total + (Array.isArray(deck.prompts) ? deck.prompts.length : 0),
        0
      ),
      serializationFailures: [
        ...exportedDecks.failures,
        ...exportedCategories.failures,
        ...exportedPlaylists.failures,
      ],
    },
    version: 1,
  };

  // The exact JSON that will be downloaded must parse before download is offered.
  JSON.parse(JSON.stringify(snapshot));
  return snapshot;
}
