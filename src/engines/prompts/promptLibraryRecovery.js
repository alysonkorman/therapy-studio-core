import { parseDeck } from "../../lib/data/promptDeckRepositorySupport";
import { promptCategorySchema } from "../../models/promptAuthoring";

export const PROMPT_LIBRARY_RECOVERY_FORMAT = "therapy-studio-prompt-library-recovery";

export function createPromptLibraryRecoverySnapshot({
  categories,
  decks,
  exportedAt,
  playlists,
}) {
  return {
    categories: categories.map((category) => promptCategorySchema.parse(category)),
    decks: decks.map((deck) => {
      const { archived = false, ...resource } = deck;
      return { archived, resource: parseDeck(resource) };
    }),
    exportedAt,
    format: PROMPT_LIBRARY_RECOVERY_FORMAT,
    playlistReferences: playlists.flatMap((playlist) =>
      playlist.items
        .filter((item) => item.type === "prompt-deck")
        .map((item) => ({
          deckId: item.deckId,
          playlistId: playlist.id,
          sortOrder: item.sortOrder,
        }))
    ),
    version: 2,
  };
}
