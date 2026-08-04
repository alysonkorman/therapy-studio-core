import { nanoid } from "nanoid";
import { z } from "zod";

const isoTimestamp = z.string().datetime({ offset: true });
const plainText = z.string().refine((value) => !/<[^>]*>/u.test(value), {
  message: "HTML is not allowed.",
});

const cleanList = z
  .array(z.string())
  .default([])
  .transform((values) => {
    const seen = new Set();
    return values.flatMap((value) => {
      const cleaned = value.trim();
      const key = cleaned.toLocaleLowerCase();
      if (!cleaned || seen.has(key)) return [];
      seen.add(key);
      return [cleaned];
    });
  });

const optionalText = z.string().trim().min(1).nullable().default(null);

export const sessionProfileSchema = z
  .object({
    id: z.string().trim().min(1),
    displayName: plainText.trim().min(1),
    archived: z.boolean().default(false),
    createdAt: isoTimestamp,
    updatedAt: isoTimestamp,
    lastOpenedAt: isoTimestamp.nullable().default(null),
    ageRange: optionalText,
    pronouns: optionalText,
    diagnoses: cleanList,
    goals: cleanList,
    presentingConcerns: cleanList,
    interests: cleanList,
    preferredActivities: cleanList,
    currentPresentationDefaults: cleanList,
    sessionLengthPreference: z.number().int().positive().nullable().default(null),
    telehealth: z.boolean().nullable().default(null),
    communicationStyle: cleanList,
    readingTolerance: optionalText,
    writingTolerance: optionalText,
    attentionSpan: optionalText,
    energyPatterns: cleanList,
    humorPreferences: cleanList,
    motivators: cleanList,
    reinforcementPreferences: cleanList,
    sensoryPreferences: cleanList,
    regulationStrategies: cleanList,
    movementNeeds: cleanList,
    transitionSupports: cleanList,
    thingsToAvoid: cleanList,
    strengths: cleanList,
    materialsUsuallyAvailable: cleanList,
    parentInvolvement: optionalText,
    customTags: cleanList,
    generalReminders: plainText.default(""),
  })
  .strict();

export function createSessionProfile(
  input,
  { id = nanoid(), now = new Date().toISOString() } = {}
) {
  return sessionProfileSchema.parse({
    ...input,
    id,
    archived: false,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: null,
  });
}
