import { z } from "zod";

import { triviaGameSchema } from "../../models";

export const TRIVIA_IMPORT_FORMAT = "therapy-studio-trivia";
export const TRIVIA_IMPORT_VERSION = 1;

export const triviaImportEnvelopeSchema = z
  .object({
    format: z.literal(TRIVIA_IMPORT_FORMAT),
    version: z.literal(TRIVIA_IMPORT_VERSION),
    sets: z.array(triviaGameSchema).min(1),
  })
  .strict()
  .superRefine(({ sets }, context) => {
    const ids = new Set();
    sets.forEach((set, index) => {
      if (ids.has(set.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate Trivia Set ID in import: ${set.id}`,
          path: ["sets", index, "id"],
        });
      }
      ids.add(set.id);
    });
  });

export class TriviaImportValidationError extends Error {
  constructor(message, { cause, details } = {}) {
    super(message, { cause });
    this.name = "TriviaImportValidationError";
    if (details) this.details = details;
  }
}

function triviaResource(input) {
  const { archived, starter, ...resource } = input;
  void archived;
  void starter;
  return triviaGameSchema.parse(resource);
}

export function validateTriviaImport(input) {
  const result = triviaImportEnvelopeSchema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new TriviaImportValidationError(
      first?.message
        ? `Trivia import is invalid: ${first.message}.`
        : "Trivia import is invalid.",
      { cause: result.error, details: result.error.issues }
    );
  }
  return result.data;
}

export function parseTriviaImportJson(text) {
  let input;
  try {
    input = JSON.parse(text);
  } catch (error) {
    throw new TriviaImportValidationError("The selected file is not valid JSON.", {
      cause: error,
    });
  }
  return validateTriviaImport(input);
}

export function createTriviaExport(sets) {
  const values = Array.isArray(sets) ? sets : [sets];
  return validateTriviaImport({
    format: TRIVIA_IMPORT_FORMAT,
    version: TRIVIA_IMPORT_VERSION,
    sets: values.map(triviaResource),
  });
}

export function createTriviaExportJson(sets) {
  return `${JSON.stringify(createTriviaExport(sets), null, 2)}\n`;
}

export function triviaExportFilename(title) {
  const safeTitle = String(title ?? "trivia")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `therapy-studio-trivia-${safeTitle || "set"}.json`;
}
