import { describe, expect, it } from "vitest";

import { previewPromptLibraryBackupJson } from "./previewPromptLibraryBackup";

const timestamp = "2026-08-24T12:00:00.000Z";

function backup(overrides = {}) {
  return {
    exportedAt: timestamp,
    format: "therapy-studio-prompt-library-stored-records",
    records: {
      categories: [{ id: "category-1", name: "Connection" }],
      playlists: [{ id: "playlist-1", items: [] }],
      promptDecks: [
        {
          archived: false,
          categoryId: "category-1",
          id: "deck-1",
          prompts: [{ id: "prompt-1", text: "How are you?" }],
          title: "Check in",
          type: "prompt-deck",
        },
      ],
    },
    summary: { missingVisibleDeckIds: [], serializationFailures: [] },
    version: 1,
    ...overrides,
  };
}

describe("Prompt Library backup preview", () => {
  it("validates an exact stored-record backup and reports its counts without mutating it", () => {
    const snapshot = backup();
    const original = JSON.stringify(snapshot);

    expect(previewPromptLibraryBackupJson(JSON.stringify(snapshot))).toMatchObject({
      format: "stored records",
      restoreEligible: true,
      summary: { categories: 1, decks: 1, playlists: 1, prompts: 1 },
    });
    expect(JSON.stringify(snapshot)).toBe(original);
  });

  it("rejects incomplete backups before any restore could be offered", () => {
    const incomplete = backup({ summary: { missingVisibleDeckIds: ["deck-missing"] } });

    expect(() => previewPromptLibraryBackupJson(JSON.stringify(incomplete))).toThrow(
      /missing one or more visible Prompt decks/i
    );
  });

  it("rejects a deck whose category relationship cannot be restored", () => {
    const invalid = backup({
      records: {
        ...backup().records,
        promptDecks: [
          { ...backup().records.promptDecks[0], categoryId: "missing-category" },
        ],
      },
    });

    expect(() => previewPromptLibraryBackupJson(JSON.stringify(invalid))).toThrow(
      /references a category/i
    );
  });

  it("rejects prompt IDs repeated across different decks", () => {
    const invalid = backup({
      records: {
        ...backup().records,
        promptDecks: [
          backup().records.promptDecks[0],
          {
            ...backup().records.promptDecks[0],
            id: "deck-2",
            prompts: [{ id: "prompt-1", text: "Repeated ID" }],
          },
        ],
      },
    });

    expect(() => previewPromptLibraryBackupJson(JSON.stringify(invalid))).toThrow(
      /duplicate prompt ID/i
    );
  });
});
