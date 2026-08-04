import { describe, expect, it } from "vitest";

import {
  playlistItemSchema,
  promptCategorySchema,
  promptPlaylistSchema,
} from "./promptAuthoring";

const now = "2026-08-03T15:00:00.000Z";

describe("prompt authoring schemas", () => {
  it("validates Category identity, appearance, order, archive state, and timestamps", () => {
    expect(
      promptCategorySchema.parse({
        id: "category-strengths",
        name: "Strengths",
        color: "#6C46C3",
        iconId: "rabbit",
        sortOrder: 0,
        archived: false,
        createdAt: now,
        updatedAt: now,
      })
    ).toMatchObject({ name: "Strengths", archived: false });
  });

  it("rejects malformed colors and unknown Category fields", () => {
    const category = {
      id: "category-invalid",
      name: "Invalid",
      color: "red",
      iconId: "rabbit",
      sortOrder: 0,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    expect(() => promptCategorySchema.parse(category)).toThrow();
    expect(() =>
      promptCategorySchema.parse({ ...category, color: "#123456", x: 1 })
    ).toThrow();
  });

  it("validates ordered Prompt Deck and Prompt Item playlist references", () => {
    expect(
      playlistItemSchema.parse({
        id: "item-1",
        type: "prompt-item",
        deckId: "deck-1",
        promptId: "prompt-1",
        sortOrder: 0,
      })
    ).toMatchObject({ promptId: "prompt-1" });
    expect(() =>
      playlistItemSchema.parse({
        id: "item-2",
        type: "prompt-item",
        deckId: "deck-1",
        sortOrder: 0,
      })
    ).toThrow();
  });

  it("validates Playlist lifecycle and nested items", () => {
    expect(
      promptPlaylistSchema.parse({
        id: "playlist-1",
        title: "Warm-up",
        description: "Start here",
        items: [],
        sortOrder: 0,
        archived: false,
        createdAt: now,
        updatedAt: now,
      })
    ).toMatchObject({ title: "Warm-up", items: [] });
  });
});
