import { nanoid } from "nanoid";
import { z } from "zod";

export const resourceTypes = [
  "prompt",
  "prompt-deck",
  "intervention",
  "game",
  "worksheet",
  "workbook",
  "psychoeducation",
  "visual",
  "scene",
  "whiteboard",
];

export const resourceSchema = z.object({
  id: z.string(),
  type: z.enum(resourceTypes),

  title: z.string().min(1),
  description: z.string().default(""),

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
