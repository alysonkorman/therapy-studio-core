import { z } from "zod";

import { worksheetDocumentSchema, worksheetSchema } from "../../models";

export const WORKSHEET_IMPORT_FORMAT = "therapy-studio-worksheets";
export const WORKSHEET_IMPORT_VERSION = 1;

const worksheetImportPairSchema = z
  .object({
    resource: worksheetSchema,
    document: worksheetDocumentSchema,
  })
  .strict()
  .superRefine(({ document, resource }, context) => {
    if (document.worksheetId !== resource.id) {
      context.addIssue({
        code: "custom",
        message: "Worksheet Resource and document IDs must match",
        path: ["document", "worksheetId"],
      });
    }
  });

export const worksheetImportEnvelopeSchema = z
  .object({
    format: z.literal(WORKSHEET_IMPORT_FORMAT),
    version: z.literal(WORKSHEET_IMPORT_VERSION),
    worksheets: z.array(worksheetImportPairSchema).min(1),
  })
  .strict()
  .superRefine(({ worksheets }, context) => {
    const ids = new Set();
    worksheets.forEach(({ resource }, index) => {
      if (ids.has(resource.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate Worksheet ID in import: ${resource.id}`,
          path: ["worksheets", index, "resource", "id"],
        });
      }
      ids.add(resource.id);
    });
  });

export class WorksheetImportValidationError extends Error {
  constructor(message, { cause, details } = {}) {
    super(message, { cause });
    this.name = "WorksheetImportValidationError";
    if (details) this.details = details;
  }
}

export function validateWorksheetImport(input) {
  const result = worksheetImportEnvelopeSchema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new WorksheetImportValidationError(
      first?.message
        ? `Worksheet import is invalid: ${first.message}.`
        : "Worksheet import is invalid.",
      { cause: result.error, details: result.error.issues }
    );
  }
  return result.data;
}

export function parseWorksheetImportJson(text) {
  let input;
  try {
    input = JSON.parse(text);
  } catch (error) {
    throw new WorksheetImportValidationError("The selected file is not valid JSON.", {
      cause: error,
    });
  }
  return validateWorksheetImport(input);
}
