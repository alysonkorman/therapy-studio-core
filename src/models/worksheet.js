import { nanoid } from "nanoid";
import { z } from "zod";

import { resourceSchema } from "./resource";

export const worksheetColorSchema = z.string().regex(/^#[0-9A-F]{6}$/);
export const THERAPIST_WORKSHEET_TEMPLATE_PROVENANCE = "therapist-template";

export function isTherapistWorksheetTemplate(worksheet) {
  return worksheet?.provenance === THERAPIST_WORKSHEET_TEMPLATE_PROVENANCE;
}

export const worksheetSchema = resourceSchema
  .extend({
    type: z.literal("worksheet"),
    category: z.string().default(""),
    color: worksheetColorSchema.default("#7C3AED"),
    iconId: z.string().default(""),
    attribution: z.string().default(""),
    provenance: z.string().default("original"),
    format: z.literal("editable").default("editable"),
  })
  .strict();

export function createWorksheetResource(
  input,
  { id = nanoid(), now = new Date().toISOString() } = {}
) {
  return worksheetSchema.parse({
    ...input,
    id,
    type: "worksheet",
    createdAt: now,
    updatedAt: now,
  });
}
