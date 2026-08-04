import { z } from "zod";

import { resourceSchema } from "./resource";

const importedIdSchema = z.union([z.string(), z.number()]);

export const promptColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a six-digit hex value");

export const promptItemSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().trim().min(1),
    type: z.string().default("discussion"),
    category: z.string().default(""),
    subcategory: z.string().nullable().default(null),
    tags: z.array(z.string()).default([]),
    ageRanges: z.array(z.string()).default([]),
    goals: z.array(z.string()).default([]),
    diagnoses: z.array(z.string()).default([]),
    settings: z.array(z.string()).default([]),
    depth: z.string().nullable().default(null),
    sortOrder: z.number().int().nonnegative().default(0),
    legacyId: importedIdSchema.optional(),
    source: z.string().default(""),
    legacyMetadata: z
      .object({
        originalId: importedIdSchema,
        artwork: z.unknown().nullable(),
        attribution: z.unknown().nullable(),
        provenance: z.record(z.string(), z.unknown()),
      })
      .optional(),
  })
  .strict();

export const promptDeckSchema = resourceSchema
  .extend({
    type: z.literal("prompt-deck"),
    category: z.string().default(""),
    categoryId: z.string().nullable().default(null),
    color: promptColorSchema.default("#6C46C3"),
    iconId: z.string().default("prompt-default"),
    sortOrder: z.number().int().nonnegative().default(0),
    tags: z.array(z.string()).default([]),
    prompts: z.array(promptItemSchema).default([]),
    legacyMetadata: z
      .object({
        originalId: importedIdSchema,
        color: z.string(),
        iconId: z.string(),
        archived: z.boolean(),
        attribution: z.unknown().nullable(),
        provenance: z.record(z.string(), z.unknown()),
      })
      .optional(),
  })
  .strict();
