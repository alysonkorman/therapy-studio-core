import { describe, expect, it } from "vitest";

import { createPromptLibraryStoredRecordsExport } from "./promptLibraryStoredRecordsExport";

describe("Prompt Library stored-record export", () => {
  it("preserves complete stored Prompt records and reports an exact read-only summary", () => {
    const deck = {
      archived: true,
      categoryId: "category-1",
      color: "#6C46C3",
      createdAt: "2026-08-21T12:00:00.000Z",
      customStoredProperty: "preserve me",
      id: "deck-1",
      iconId: "ideas",
      prompts: [
        { id: "prompt-1", sortOrder: 0, text: "One" },
        { id: "prompt-2", sortOrder: 1, text: "Two" },
      ],
      sortOrder: 3,
      type: "prompt-deck",
      updatedAt: "2026-08-21T12:01:00.000Z",
    };
    const snapshot = createPromptLibraryStoredRecordsExport({
      categories: [{ id: "category-1", name: "Icebreakers" }],
      exportedAt: "2026-08-21T12:02:00.000Z",
      playlists: [{ id: "playlist-1", items: [{ deckId: "deck-1" }] }],
      resources: [deck, { id: "worksheet-1", type: "worksheet" }],
      visibleDeckIds: ["deck-1", "missing-deck"],
    });

    expect(snapshot.records.promptDecks).toEqual([deck]);
    expect(snapshot.summary).toMatchObject({
      categories: 1,
      decks: 1,
      missingVisibleDeckIds: ["missing-deck"],
      playlists: 1,
      prompts: 2,
      serializationFailures: [],
    });
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });
});
