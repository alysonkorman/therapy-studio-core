import { describe, expect, it } from "vitest";

import { promptDeckSchema, promptItemSchema } from "./prompt";

const prompt = {
  id: "7",
  text: "What helped today?",
  type: "reflection",
  category: "conversation",
  subcategory: null,
  tags: [],
  ageRanges: [],
  goals: [],
  diagnoses: [],
  settings: [],
  depth: null,
  source: "",
  legacyMetadata: {
    originalId: 7,
    artwork: null,
    attribution: null,
    provenance: {},
  },
};

const deck = {
  id: "3",
  type: "prompt-deck",
  title: "Reflection",
  description: "",
  worksWellWhen: [],
  useWith: [],
  kidsWhoLike: [],
  goals: [],
  diagnoses: [],
  ageRanges: [],
  settings: [],
  materials: [],
  durationMinutes: null,
  telehealthFriendly: true,
  source: "",
  research: [],
  myNotes: "",
  rating: null,
  favorite: false,
  relatedResourceIds: [],
  usageCount: 0,
  lastUsedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  category: "conversation",
  tags: [],
  prompts: [prompt],
  legacyMetadata: {
    originalId: 3,
    color: "#fff",
    iconId: "chat",
    archived: false,
    attribution: null,
    provenance: {},
  },
};

describe("prompt schemas", () => {
  it("validates a nested prompt deck resource", () => {
    expect(promptDeckSchema.parse(deck).prompts).toHaveLength(1);
  });

  it("rejects empty prompt text", () => {
    expect(() => promptItemSchema.parse({ ...prompt, text: "  " })).toThrow();
  });

  it("keeps card visual overrides optional and backward compatible", () => {
    expect(promptItemSchema.parse(prompt)).not.toHaveProperty("iconId");
    expect(promptItemSchema.parse({ ...prompt, iconId: "reading" }).iconId).toBe(
      "reading"
    );
    expect(promptItemSchema.parse({ ...prompt, iconId: null }).iconId).toBeNull();
  });

  it("preserves repaired identity metadata", () => {
    const repaired = promptItemSchema.parse({
      ...prompt,
      id: "bcd8ba31-7461-40db-a991-76d0a7865ae8",
      legacyId: 4,
    });

    expect(repaired.id).toBe("bcd8ba31-7461-40db-a991-76d0a7865ae8");
    expect(repaired.legacyId).toBe(4);
  });
});
