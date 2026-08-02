import { z } from "zod";

import { resourceSchema } from "./resource";

const importedIdSchema = z.union([z.string(), z.number()]);

export const promptItemSchema = z.object({
  id: z.string().min(1),
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
  legacyId: importedIdSchema.optional(),
  source: z.string().default(""),
  legacyMetadata: z.object({
    originalId: importedIdSchema,
    artwork: z.unknown().nullable(),
    attribution: z.unknown().nullable(),
    provenance: z.record(z.string(), z.unknown()),
  }),
});

export const promptDeckSchema = resourceSchema.extend({
  type: z.literal("prompt-deck"),
  category: z.string(),
  tags: z.array(z.string()),
  prompts: z.array(promptItemSchema),
  legacyMetadata: z.object({
    originalId: importedIdSchema,
    color: z.string(),
    iconId: z.string(),
    archived: z.boolean(),
    attribution: z.unknown().nullable(),
    provenance: z.record(z.string(), z.unknown()),
  }),
});
