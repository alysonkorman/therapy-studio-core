import { z } from "zod";

import { interventionGuidanceSchema, resourceSchema } from "../../models";

export const INTERVENTION_IMPORT_FORMAT = "therapy-studio-interventions";
export const INTERVENTION_IMPORT_VERSION = 1;

const interventionResourceSchema = resourceSchema
  .strict()
  .refine(
    (resource) => resource.type === "intervention",
    "Resource type must be intervention"
  );

const interventionPairSchema = z
  .object({
    resource: interventionResourceSchema,
    guidance: interventionGuidanceSchema,
  })
  .strict()
  .superRefine((pair, context) => {
    if (pair.resource.id !== pair.guidance.resourceId) {
      context.addIssue({
        code: "custom",
        message: "Intervention Resource and guidance IDs must match",
        path: ["guidance", "resourceId"],
      });
    }
  });

export const interventionImportEnvelopeSchema = z
  .object({
    format: z.literal(INTERVENTION_IMPORT_FORMAT),
    version: z.literal(INTERVENTION_IMPORT_VERSION),
    interventions: z.array(interventionPairSchema).min(1),
  })
  .strict()
  .superRefine((envelope, context) => {
    const seen = new Set();
    envelope.interventions.forEach(({ resource }, index) => {
      if (seen.has(resource.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate Intervention ID: ${resource.id}`,
          path: ["interventions", index, "resource", "id"],
        });
      }
      seen.add(resource.id);
    });
  });

export class InterventionImportValidationError extends Error {
  constructor(message, { cause, details } = {}) {
    super(message, { cause });
    this.name = "InterventionImportValidationError";
    if (details) this.details = details;
  }
}

export function validateInterventionImport(input) {
  const result = interventionImportEnvelopeSchema.safeParse(input);
  if (!result.success) {
    throw new InterventionImportValidationError(
      "This file is not a valid Therapy Studio Intervention import.",
      { cause: result.error, details: result.error.issues }
    );
  }
  return result.data;
}

export function parseInterventionImportJson(text) {
  let input;
  try {
    input = JSON.parse(text);
  } catch (error) {
    throw new InterventionImportValidationError(
      "Therapy Studio could not read this JSON file.",
      { cause: error }
    );
  }
  return validateInterventionImport(input);
}
