import { nanoid } from "nanoid";
import { z } from "zod";

export const resourceTypes = Object.freeze([
  "prompt",
  "prompt-deck",
  "intervention",
  "game",
  "worksheet",
  "workbook",
  "psychoeducation",
  "activity",
  "visual",
  "scene",
  "whiteboard",
]);

export const resourceTypeSchema = z.enum(resourceTypes);

export const resourceIdentitySchema = z
  .object({
    id: z.string().trim().min(1),
    type: resourceTypeSchema,
  })
  .strict();

export function getResourceKey(resource) {
  const { id, type } = resourceIdentitySchema.parse({
    id: resource?.id,
    type: resource?.type,
  });
  return `${type}:${id}`;
}

export function assertUniqueResourceIds(resources) {
  const ids = new Set();

  for (const resource of resources) {
    const { id } = resourceIdentitySchema.parse({
      id: resource?.id,
      type: resource?.type,
    });
    if (ids.has(id)) {
      throw new Error(`Duplicate global Resource ID: ${id}`);
    }
    ids.add(id);
  }

  return resources;
}

export const resourceSchema = z.object({
  id: z.string(),
  type: resourceTypeSchema,

  title: z.string().min(1),
  description: z.string().default(""),
  tags: z.array(z.string()).default([]),

  worksWellWhen: z.array(z.string()).default([]),
  useWith: z.array(z.string()).default([]),
  kidsWhoLike: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  diagnoses: z.array(z.string()).default([]),
  ageRanges: z.array(z.string()).default([]),
  settings: z.array(z.string()).default([]),
  materials: z.array(z.string()).default([]),

  durationMinutes: z.number().nullable().default(null),
  telehealthFriendly: z.boolean().default(true),

  source: z.string().default(""),
  research: z.array(z.string()).default([]),

  myNotes: z.string().default(""),
  rating: z.number().min(0).max(5).nullable().default(null),
  favorite: z.boolean().default(false),

  relatedResourceIds: z.array(z.string()).default([]),

  usageCount: z.number().int().nonnegative().default(0),
  lastUsedAt: z.string().nullable().default(null),

  createdAt: z.string(),
  updatedAt: z.string(),
});

export function createResource(input) {
  const now = new Date().toISOString();

  return resourceSchema.parse({
    id: nanoid(),
    type: input.type,
    title: input.title,
    description: input.description ?? "",
    tags: input.tags ?? [],

    worksWellWhen: input.worksWellWhen ?? [],
    useWith: input.useWith ?? [],
    kidsWhoLike: input.kidsWhoLike ?? [],
    goals: input.goals ?? [],
    diagnoses: input.diagnoses ?? [],
    ageRanges: input.ageRanges ?? [],
    settings: input.settings ?? [],
    materials: input.materials ?? [],

    durationMinutes: input.durationMinutes ?? null,
    telehealthFriendly: input.telehealthFriendly ?? true,

    source: input.source ?? "",
    research: input.research ?? [],

    myNotes: input.myNotes ?? "",
    rating: input.rating ?? null,
    favorite: input.favorite ?? false,

    relatedResourceIds: input.relatedResourceIds ?? [],

    usageCount: 0,
    lastUsedAt: null,

    createdAt: now,
    updatedAt: now,
  });
}
