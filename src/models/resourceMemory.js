import { z } from "zod";

const isoTimestampSchema = z.string().datetime({ offset: true });
const plainTextSchema = z
  .string()
  .refine((value) => !/<[^>]*>/u.test(value), "HTML is not allowed.");

function normalizeValues(value) {
  if (!Array.isArray(value)) return value;
  const seen = new Set();
  return value.flatMap((item) => {
    if (typeof item !== "string") return [item];
    const retained = item.trim();
    const key = retained.toLocaleLowerCase();
    if (!retained || seen.has(key)) return [];
    seen.add(key);
    return [retained];
  });
}

export const resourceMemoryValuesSchema = z.preprocess(
  normalizeValues,
  z.array(plainTextSchema)
);

export const resourceMemorySchema = z
  .object({
    resourceId: z.string().trim().min(1),
    createdAt: isoTimestampSchema,
    updatedAt: isoTimestampSchema,
    favorite: z.boolean().default(false),
    rating: z.number().int().min(1).max(5).nullable().default(null),
    useCount: z.number().int().nonnegative().default(0),
    lastUsedAt: isoTimestampSchema.nullable().default(null),
    therapistNotes: plainTextSchema.default(""),
    worksWellWhen: resourceMemoryValuesSchema.default([]),
    kidsWhoUsuallyLikeThis: resourceMemoryValuesSchema.default([]),
    adaptations: resourceMemoryValuesSchema.default([]),
  })
  .strict();

export function createDefaultResourceMemory(resourceId, timestamp) {
  return resourceMemorySchema.parse({
    resourceId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}
