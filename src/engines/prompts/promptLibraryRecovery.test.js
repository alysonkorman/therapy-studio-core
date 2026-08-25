import { describe, expect, it } from "vitest";

import {
  createPromptLibraryRecoverySnapshot,
  PROMPT_LIBRARY_RECOVERY_FORMAT,
} from "./promptLibraryRecovery";

const deck = {
  archived: false,
  category: "Connection",
  categoryId: null,
  color: "#6C46C3",
  createdAt: "2026-08-19T12:00:00.000Z",
  description: "",
  iconId: "prompt-default",
  id: "deck-one",
  prompts: [{ id: "prompt-one", text: "What helps?" }],
  sortOrder: 0,
  title: "Recovery deck",
  type: "prompt-deck",
  updatedAt: "2026-08-19T12:00:00.000Z",
};

describe("createPromptLibraryRecoverySnapshot", () => {
  it("contains only Prompt content and Prompt playlist references", () => {
    const snapshot = createPromptLibraryRecoverySnapshot({
      categories: [
        {
          archived: false,
          color: "#6C46C3",
          createdAt: "2026-08-19T12:00:00.000Z",
          iconId: "prompt-default",
          id: "category-one",
          name: "Connection",
          sortOrder: 0,
          updatedAt: "2026-08-19T12:00:00.000Z",
        },
      ],
      decks: [deck],
      exportedAt: "2026-08-19T12:01:00.000Z",
      playlists: [
        {
          id: "playlist-one",
          items: [
            { deckId: "deck-one", sortOrder: 0, type: "prompt-deck" },
            { deckId: "worksheet-one", sortOrder: 1, type: "worksheet" },
          ],
        },
      ],
    });

    expect(snapshot).toEqual({
      categories: [expect.objectContaining({ id: "category-one", name: "Connection" })],
      decks: [{ archived: false, resource: expect.objectContaining({ id: "deck-one" }) }],
      exportedAt: "2026-08-19T12:01:00.000Z",
      format: PROMPT_LIBRARY_RECOVERY_FORMAT,
      playlistReferences: [
        { deckId: "deck-one", playlistId: "playlist-one", sortOrder: 0 },
      ],
      version: 2,
    });
    expect(JSON.stringify(snapshot)).not.toContain("resourceMemory");
    expect(JSON.stringify(snapshot)).not.toContain("Session Profile");
  });
});
