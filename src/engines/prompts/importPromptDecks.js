import { z } from "zod";

import { promptDeckSchema } from "../../models/prompt";

const importedIdSchema = z.union([z.string(), z.number()]);

const importedPromptSchema = z.object({
  id: importedIdSchema,
  legacyId: importedIdSchema.optional(),
  text: z.string().trim().min(1),
  type: z.string(),
  category: z.string(),
  subcategory: z.string().nullable(),
  tags: z.array(z.string()),
  ageRanges: z.array(z.string()),
  goals: z.array(z.string()),
  diagnoses: z.array(z.string()),
  settings: z.array(z.string()),
  depth: z.string().nullable(),
  artwork: z.unknown().nullable(),
  source: z.string().nullable(),
  attribution: z.unknown().nullable(),
});

const importedDeckSchema = z.object({
  id: importedIdSchema,
  title: z.string().trim().min(1),
  description: z.string().nullable(),
  category: z.string(),
  color: z.string(),
  iconId: z.string(),
  archived: z.boolean(),
  tags: z.array(z.string()),
  ageRanges: z.array(z.string()),
  goals: z.array(z.string()),
  diagnoses: z.array(z.string()),
  source: z.string().nullable(),
  attribution: z.unknown().nullable(),
  prompts: z.array(importedPromptSchema),
});

const promptExportSchema = z.object({
  exportVersion: z.literal(1),
  exportedAt: z.string().datetime(),
  source: z.record(z.string(), z.unknown()),
  counts: z.object({
    decks: z.number().int().nonnegative(),
    prompts: z.number().int().nonnegative(),
  }),
  decks: z.array(importedDeckSchema),
});

function assertUniqueIds(records, scope) {
  const ids = new Set();

  for (const record of records) {
    const id = String(record.id);
    if (ids.has(id)) {
      throw new Error(`Duplicate ${scope} ID after string conversion: ${id}`);
    }
    ids.add(id);
  }
}

function transformPrompt(prompt, provenance) {
  return {
    id: String(prompt.id),
    text: prompt.text,
    type: prompt.type,
    category: prompt.category,
    subcategory: prompt.subcategory,
    tags: prompt.tags,
    ageRanges: prompt.ageRanges,
    goals: prompt.goals,
    diagnoses: prompt.diagnoses,
    settings: prompt.settings,
    depth: prompt.depth,
    ...(prompt.legacyId === undefined ? {} : { legacyId: prompt.legacyId }),
    source: prompt.source ?? "",
    legacyMetadata: {
      originalId: prompt.id,
      artwork: prompt.artwork,
      attribution: prompt.attribution,
      provenance,
    },
  };
}

function transformDeck(deck, exportedAt, provenance) {
  assertUniqueIds(deck.prompts, `prompt in deck ${String(deck.id)}`);

  return promptDeckSchema.parse({
    id: String(deck.id),
    type: "prompt-deck",
    title: deck.title,
    description: deck.description ?? "",
    worksWellWhen: [],
    useWith: [],
    kidsWhoLike: [],
    goals: deck.goals,
    diagnoses: deck.diagnoses,
    ageRanges: deck.ageRanges,
    settings: [],
    materials: [],
    durationMinutes: null,
    telehealthFriendly: true,
    source: deck.source ?? "",
    research: [],
    myNotes: "",
    rating: null,
    favorite: false,
    relatedResourceIds: [],
    usageCount: 0,
    lastUsedAt: null,
    createdAt: exportedAt,
    updatedAt: exportedAt,
    category: deck.category,
    tags: deck.tags,
    prompts: deck.prompts.map((prompt) => transformPrompt(prompt, provenance)),
    legacyMetadata: {
      originalId: deck.id,
      color: deck.color,
      iconId: deck.iconId,
      archived: deck.archived,
      attribution: deck.attribution,
      provenance,
    },
  });
}

export function importPromptDecks(input) {
  const imported = promptExportSchema.parse(input);
  assertUniqueIds(imported.decks, "deck");

  const promptCount = imported.decks.reduce(
    (total, deck) => total + deck.prompts.length,
    0
  );
  if (
    imported.counts.decks !== imported.decks.length ||
    imported.counts.prompts !== promptCount
  ) {
    throw new Error("Export counts do not match the included deck and prompt records");
  }

  const provenance = {
    exportVersion: imported.exportVersion,
    exportedAt: imported.exportedAt,
    source: imported.source,
  };

  return imported.decks.map((deck) =>
    transformDeck(deck, imported.exportedAt, provenance)
  );
}

export { importedDeckSchema, importedPromptSchema, promptExportSchema };
