import Dexie from "dexie";

export const authoringErrorCodes = Object.freeze({
  invalidInput: "invalid-authoring-input",
  notFound: "authoring-record-not-found",
  duplicate: "duplicate-authoring-record",
  invalidOrder: "invalid-authoring-order",
  invalidReference: "invalid-authoring-reference",
  databaseUnavailable: "database-unavailable",
  databaseOpenFailed: "database-open-failed",
  transactionFailed: "authoring-transaction-failed",
});

export class PromptAuthoringRepositoryError extends Error {
  constructor(code, message, { cause, details } = {}) {
    super(message, { cause });
    this.name = "PromptAuthoringRepositoryError";
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

export function authoringError(code, message, options) {
  return new PromptAuthoringRepositoryError(code, message, options);
}

export async function ensureAuthoringDatabaseOpen(database) {
  if (database.isOpen()) return;
  try {
    await database.open();
  } catch (error) {
    const missing =
      error instanceof Dexie.MissingAPIError ||
      error?.name === "MissingAPIError" ||
      /IndexedDB API missing/i.test(error?.message ?? "");
    throw authoringError(
      missing
        ? authoringErrorCodes.databaseUnavailable
        : authoringErrorCodes.databaseOpenFailed,
      missing
        ? "IndexedDB is unavailable in this environment."
        : "The Prompt Authoring database could not be opened.",
      { cause: error }
    );
  }
}

export function rethrowAuthoringError(error, code, message) {
  if (error instanceof PromptAuthoringRepositoryError) throw error;
  throw authoringError(code, message, { cause: error });
}

export function assertOnlyFields(changes, allowedFields) {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    throw authoringError(authoringErrorCodes.invalidInput, "Changes must be an object.");
  }
  const unknown = Object.keys(changes).find((field) => !allowedFields.includes(field));
  if (unknown) {
    throw authoringError(
      authoringErrorCodes.invalidInput,
      `Unknown authoring field: ${unknown}`,
      { details: { field: unknown } }
    );
  }
}

export function normalizeMetadataValues(values) {
  if (!Array.isArray(values)) {
    throw authoringError(authoringErrorCodes.invalidInput, "Metadata must be an array.");
  }
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

export function assertUniqueIds(ids, expectedIds) {
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length) {
    throw authoringError(
      authoringErrorCodes.invalidOrder,
      "Order contains duplicate IDs."
    );
  }
  const expected = new Set(expectedIds);
  if (ids.some((id) => !expected.has(id))) {
    throw authoringError(
      authoringErrorCodes.invalidOrder,
      "Order contains an unknown ID."
    );
  }
  if (ids.length !== expectedIds.length) {
    throw authoringError(
      authoringErrorCodes.invalidOrder,
      "Order must include every record."
    );
  }
}

export function sortedByOrder(records) {
  return [...records].sort(
    (first, second) =>
      first.sortOrder - second.sortOrder || first.id.localeCompare(second.id)
  );
}
