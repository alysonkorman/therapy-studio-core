import { previewPromptLibraryBackup } from "./previewPromptLibraryBackup";

function clone(value) {
  return structuredClone(value);
}

function recoveryRecords(backup) {
  const preview = previewPromptLibraryBackup(backup);
  if (preview.format === "stored records") {
    return {
      categories: backup.records.categories,
      playlists: backup.records.playlists,
      promptDecks: backup.records.promptDecks,
      summary: preview.summary,
    };
  }

  const playlistReferences = backup.playlistReferences ?? [];
  if (playlistReferences.length) {
    throw new Error(
      "This backup contains playlist references without complete playlist records and cannot be restored safely."
    );
  }

  return {
    categories: backup.categories,
    playlists: [],
    promptDecks: backup.decks.map(({ archived, resource }) => ({ ...resource, archived })),
    summary: preview.summary,
  };
}

export async function restorePromptLibraryRecovery({ backup, database }) {
  const records = recoveryRecords(backup);
  const categories = database.table("categories");
  const resources = database.table("resources");
  const playlists = database.table("playlists");

  await database.transaction(
    "rw",
    [categories, resources, playlists],
    async () => {
      const [storedCategories, storedResources] = await Promise.all([
        categories.toArray(),
        resources.toArray(),
      ]);
      const storedIds = new Set(storedResources.map(({ id }) => id));
      const storedCategoryIds = new Set(storedCategories.map(({ id }) => id));
      const storedPromptIds = new Set(
        storedResources
          .filter(({ type }) => type === "prompt-deck")
          .flatMap(({ prompts = [] }) => prompts.map(({ id }) => id))
      );
      const collisions = [
        ...records.categories
          .filter(({ id }) => storedCategoryIds.has(id))
          .map(({ id }) => `category ${id}`),
        ...records.promptDecks
          .filter(({ id }) => storedIds.has(id))
          .map(({ id }) => `deck ${id}`),
        ...records.promptDecks.flatMap(({ prompts }) =>
          prompts
            .filter(({ id }) => storedPromptIds.has(id))
            .map(({ id }) => `prompt ${id}`)
        ),
      ];

      if (collisions.length) {
        throw new Error(
          `Restore was not started because existing IDs would be overwritten: ${collisions
            .slice(0, 3)
            .join(", ")}${collisions.length > 3 ? ` and ${collisions.length - 3} more` : ""}. Nothing was changed.`
        );
      }

      await categories.bulkAdd(clone(records.categories));
      await resources.bulkAdd(clone(records.promptDecks));
      await playlists.bulkAdd(clone(records.playlists));
    }
  );

  return records.summary;
}
