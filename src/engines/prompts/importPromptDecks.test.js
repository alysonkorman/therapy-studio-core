import { describe, expect, it } from "vitest";

import therapyToolkitPromptExport from "../../../imports/therapy-toolkit-prompts.json";

import { importPromptDecks } from "./importPromptDecks";

const exportedAt = "2026-07-29T14:25:00.000Z";

function makePrompt(overrides = {}) {
  return {
    id: 4,
    text: "Where do you feel frustration in your body?",
    type: "mindfulness",
    category: "conversation",
    subcategory: null,
    tags: ["feelings"],
    ageRanges: ["5–7"],
    goals: [],
    diagnoses: [],
    settings: [],
    depth: null,
    artwork: { mode: "deck", iconId: null },
    source: null,
    attribution: null,
    ...overrides,
  };
}

function makeDeck(overrides = {}) {
  return {
    id: 12,
    title: "Body Clues",
    description: null,
    category: "conversation",
    color: "#aabbcc",
    iconId: "body",
    archived: false,
    tags: ["feelings"],
    ageRanges: ["5–7"],
    goals: ["Emotion identification"],
    diagnoses: [],
    source: null,
    attribution: { name: "Example source" },
    prompts: [makePrompt()],
    ...overrides,
  };
}

function makeExport(decks = [makeDeck()], overrides = {}) {
  return {
    exportVersion: 1,
    exportedAt,
    source: { application: "Therapy Toolkit" },
    counts: {
      decks: decks.length,
      prompts: decks.reduce((sum, deck) => sum + deck.prompts.length, 0),
    },
    decks,
    ...overrides,
  };
}

describe("importPromptDecks", () => {
  it("validates and transforms the complete Therapy Toolkit export", () => {
    const decks = importPromptDecks(therapyToolkitPromptExport);

    expect(decks).toHaveLength(137);
    expect(decks.flatMap((deck) => deck.prompts)).toHaveLength(8679);
    expect(
      decks
        .flatMap((deck) => deck.prompts)
        .filter((prompt) => prompt.legacyId !== undefined)
    ).toHaveLength(51);
  });

  it("transforms a valid export into nested prompt-deck resources", () => {
    const [deck] = importPromptDecks(makeExport());

    expect(deck).toMatchObject({
      id: "12",
      type: "prompt-deck",
      description: "",
      source: "",
      category: "conversation",
      categoryId: "prompt-category-conversation",
      color: "#aabbcc",
      iconId: "body",
      sortOrder: 0,
      goals: ["Emotion identification"],
      createdAt: exportedAt,
      updatedAt: exportedAt,
    });
    expect(deck.prompts[0]).toMatchObject({
      id: "4",
      text: "Where do you feel frustration in your body?",
      source: "",
      sortOrder: 0,
    });
  });

  it("rejects unsupported export versions", () => {
    expect(() =>
      importPromptDecks(makeExport(undefined, { exportVersion: 2 }))
    ).toThrow();
  });

  it("rejects export counts that do not match the records", () => {
    expect(() =>
      importPromptDecks(makeExport(undefined, { counts: { decks: 1, prompts: 999 } }))
    ).toThrow(/Export counts/);
  });

  it("preserves stable string IDs and converts numeric IDs to strings", () => {
    const [deck] = importPromptDecks(
      makeExport([makeDeck({ id: "deck-alpha", prompts: [makePrompt({ id: 42 })] })])
    );

    expect(deck.id).toBe("deck-alpha");
    expect(deck.prompts[0].id).toBe("42");
    expect(deck.legacyMetadata.originalId).toBe("deck-alpha");
    expect(deck.prompts[0].legacyMetadata.originalId).toBe(42);
  });

  it("preserves repaired UUIDs and legacy IDs exactly", () => {
    const uuid = "bcd8ba31-7461-40db-a991-76d0a7865ae8";
    const [deck] = importPromptDecks(
      makeExport([makeDeck({ prompts: [makePrompt({ id: uuid, legacyId: 4 })] })])
    );

    expect(deck.prompts[0].id).toBe(uuid);
    expect(deck.prompts[0].legacyId).toBe(4);
    expect(deck.prompts[0].legacyMetadata.originalId).toBe(uuid);
  });

  it("accepts missing legacyId and nullable imported description and source", () => {
    const [deck] = importPromptDecks(makeExport());

    expect(deck.description).toBe("");
    expect(deck.source).toBe("");
    expect(deck.prompts[0]).not.toHaveProperty("legacyId");
  });

  it("rejects empty prompt text", () => {
    expect(() =>
      importPromptDecks(makeExport([makeDeck({ prompts: [makePrompt({ text: "  " })] })]))
    ).toThrow();
  });

  it("rejects duplicate deck IDs after string conversion", () => {
    expect(() =>
      importPromptDecks(makeExport([makeDeck({ id: 12 }), makeDeck({ id: "12" })]))
    ).toThrow(/Duplicate deck ID/);
  });

  it("rejects duplicate prompt IDs within a deck after string conversion", () => {
    expect(() =>
      importPromptDecks(
        makeExport([
          makeDeck({ prompts: [makePrompt({ id: 4 }), makePrompt({ id: "4" })] }),
        ])
      )
    ).toThrow(/Duplicate prompt in deck 12 ID/);
  });

  it("preserves attribution, artwork, and provenance metadata", () => {
    const [deck] = importPromptDecks(makeExport());

    expect(deck.legacyMetadata.attribution).toEqual({ name: "Example source" });
    expect(deck.legacyMetadata.provenance.source).toEqual({
      application: "Therapy Toolkit",
    });
    expect(deck.prompts[0].legacyMetadata.artwork).toEqual({
      mode: "deck",
      iconId: null,
    });
  });

  it("is deterministic across repeated transformations", () => {
    const input = makeExport();
    expect(importPromptDecks(input)).toEqual(importPromptDecks(input));
  });
});
