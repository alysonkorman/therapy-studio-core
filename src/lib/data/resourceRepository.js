import Dexie from "dexie";

import { gameResourceSchema } from "../../models/game";
import { promptDeckSchema } from "../../models/prompt";
import { resourceSchema } from "../../models/resource";
import { worksheetSchema } from "../../models/worksheet";
import { getTherapyStudioDatabase } from "./database";

export const resourceRepositoryErrorCodes = Object.freeze({
  invalidResource: "invalid-resource",
  duplicateResource: "duplicate-resource",
  resourceNotFound: "resource-not-found",
  invalidUpdate: "invalid-update",
  malformedStoredRecord: "malformed-stored-record",
  databaseUnavailable: "database-unavailable",
  databaseOpenFailed: "database-open-failed",
  transactionFailed: "transaction-failed",
  writeFailed: "write-failed",
});

export class ResourceRepositoryError extends Error {
  constructor(code, message, { cause, details } = {}) {
    super(message, { cause });
    this.name = "ResourceRepositoryError";
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

function repositoryError(code, message, options) {
  return new ResourceRepositoryError(code, message, options);
}

function schemaFor(resource) {
  if (resource?.type === "prompt-deck") return promptDeckSchema;
  if (resource?.type === "worksheet") return worksheetSchema;
  if (resource?.type === "game") return gameResourceSchema;
  return resourceSchema;
}

function hasUnknownTopLevelFields(input, parsed) {
  return Object.keys(input).some((key) => !(key in parsed));
}

function parseResource(input, code = resourceRepositoryErrorCodes.invalidResource) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw repositoryError(code, "Resource must be an object.");
  }

  const result = schemaFor(input).safeParse(input);
  if (!result.success || hasUnknownTopLevelFields(input, result.data)) {
    throw repositoryError(code, "Resource failed schema validation.", {
      cause: result.error,
      details: result.error?.issues,
    });
  }
  return result.data;
}

function parseStoredRecord(record) {
  if (!record || typeof record.archived !== "boolean") {
    throw repositoryError(
      resourceRepositoryErrorCodes.malformedStoredRecord,
      "Stored Resource record is malformed."
    );
  }

  const { archived, ...resource } = record;
  try {
    return { resource: parseResource(resource), archived };
  } catch (error) {
    throw repositoryError(
      resourceRepositoryErrorCodes.malformedStoredRecord,
      `Stored Resource ${String(record.id ?? "record")} is malformed.`,
      { cause: error }
    );
  }
}

function publicRecord(record) {
  const { resource, archived } = parseStoredRecord(record);
  return { ...resource, archived };
}

function storedRecord(resource, archived = false) {
  return { ...resource, archived };
}

function isMissingApiError(error) {
  return (
    error instanceof Dexie.MissingAPIError ||
    error?.name === "MissingAPIError" ||
    /IndexedDB API missing/i.test(error?.message ?? "")
  );
}

async function ensureDatabaseOpen(database) {
  if (database.isOpen()) return;

  try {
    await database.open();
  } catch (error) {
    if (isMissingApiError(error)) {
      throw repositoryError(
        resourceRepositoryErrorCodes.databaseUnavailable,
        "IndexedDB is unavailable in this environment.",
        { cause: error }
      );
    }
    throw repositoryError(
      resourceRepositoryErrorCodes.databaseOpenFailed,
      "Therapy Studio could not open its Resource database.",
      { cause: error }
    );
  }
}

function rethrowRepositoryError(error, code, message) {
  if (error instanceof ResourceRepositoryError) throw error;
  throw repositoryError(code, message, { cause: error });
}

export function createResourceRepository({
  database = getTherapyStudioDatabase(),
  now = () => new Date().toISOString(),
} = {}) {
  async function getAllResources({ includeArchived = false } = {}) {
    await ensureDatabaseOpen(database);
    try {
      const records = await database.table("resources").toArray();
      return records
        .map(publicRecord)
        .filter((record) => includeArchived || !record.archived)
        .sort((first, second) => first.id.localeCompare(second.id));
    } catch (error) {
      rethrowRepositoryError(
        error,
        resourceRepositoryErrorCodes.transactionFailed,
        "Stored Resources could not be read."
      );
    }
  }

  async function getResourceById(id) {
    await ensureDatabaseOpen(database);
    try {
      const record = await database.table("resources").get(id);
      if (!record) {
        throw repositoryError(
          resourceRepositoryErrorCodes.resourceNotFound,
          `Resource not found: ${id}`,
          { details: { id } }
        );
      }
      return publicRecord(record);
    } catch (error) {
      rethrowRepositoryError(
        error,
        resourceRepositoryErrorCodes.transactionFailed,
        `Stored Resource could not be read: ${id}`
      );
    }
  }

  async function createResourceRecord(input) {
    const resource = parseResource(input);
    await ensureDatabaseOpen(database);
    try {
      await database.table("resources").add(storedRecord(resource));
      return { ...resource, archived: false };
    } catch (error) {
      if (error instanceof Dexie.ConstraintError || error?.name === "ConstraintError") {
        throw repositoryError(
          resourceRepositoryErrorCodes.duplicateResource,
          `Resource already exists: ${resource.id}`,
          { cause: error, details: { id: resource.id } }
        );
      }
      rethrowRepositoryError(
        error,
        resourceRepositoryErrorCodes.writeFailed,
        `Resource could not be created: ${resource.id}`
      );
    }
  }

  async function createResourceRecords(inputs) {
    if (!Array.isArray(inputs) || !inputs.length) {
      throw repositoryError(
        resourceRepositoryErrorCodes.invalidResource,
        "Resource import must include at least one Resource."
      );
    }
    const resources = inputs.map((input) => parseResource(input));
    const ids = resources.map(({ id }) => id);
    if (new Set(ids).size !== ids.length) {
      throw repositoryError(
        resourceRepositoryErrorCodes.duplicateResource,
        "Resource import contains duplicate IDs."
      );
    }

    await ensureDatabaseOpen(database);
    try {
      await database.transaction("rw", database.table("resources"), async () => {
        const table = database.table("resources");
        for (const id of ids) {
          if (await table.get(id)) {
            throw repositoryError(
              resourceRepositoryErrorCodes.duplicateResource,
              `Resource already exists: ${id}`,
              { details: { id } }
            );
          }
        }
        await table.bulkAdd(resources.map((resource) => storedRecord(resource)));
      });
      return resources.map((resource) => ({ ...resource, archived: false }));
    } catch (error) {
      if (error instanceof ResourceRepositoryError) throw error;
      if (error instanceof Dexie.ConstraintError || error?.name === "ConstraintError") {
        throw repositoryError(
          resourceRepositoryErrorCodes.duplicateResource,
          "A Resource ID already exists.",
          { cause: error }
        );
      }
      rethrowRepositoryError(
        error,
        resourceRepositoryErrorCodes.writeFailed,
        "Resources could not be created."
      );
    }
  }

  async function updateResourceRecord(id, changes) {
    if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
      throw repositoryError(
        resourceRepositoryErrorCodes.invalidUpdate,
        "Resource update must be an object."
      );
    }
    const protectedFields = ["id", "createdAt", "updatedAt", "archived"];
    if (protectedFields.some((field) => field in changes)) {
      throw repositoryError(
        resourceRepositoryErrorCodes.invalidUpdate,
        "Resource identity, lifecycle, and archive fields cannot be updated directly."
      );
    }

    await ensureDatabaseOpen(database);
    try {
      return await database.transaction("rw", database.table("resources"), async () => {
        const table = database.table("resources");
        const stored = await table.get(id);
        if (!stored) {
          throw repositoryError(
            resourceRepositoryErrorCodes.resourceNotFound,
            `Resource not found: ${id}`,
            { details: { id } }
          );
        }
        const current = parseStoredRecord(stored);
        let updated;
        try {
          updated = parseResource(
            {
              ...current.resource,
              ...changes,
              id: current.resource.id,
              createdAt: current.resource.createdAt,
              updatedAt: now(),
            },
            resourceRepositoryErrorCodes.invalidUpdate
          );
        } catch (error) {
          rethrowRepositoryError(
            error,
            resourceRepositoryErrorCodes.invalidUpdate,
            `Resource update is invalid: ${id}`
          );
        }
        await table.put(storedRecord(updated, current.archived));
        return { ...updated, archived: current.archived };
      });
    } catch (error) {
      rethrowRepositoryError(
        error,
        resourceRepositoryErrorCodes.transactionFailed,
        `Resource update transaction failed: ${id}`
      );
    }
  }

  async function setArchived(id, archived) {
    await ensureDatabaseOpen(database);
    try {
      return await database.transaction("rw", database.table("resources"), async () => {
        const table = database.table("resources");
        const stored = await table.get(id);
        if (!stored) {
          throw repositoryError(
            resourceRepositoryErrorCodes.resourceNotFound,
            `Resource not found: ${id}`,
            { details: { id } }
          );
        }
        const current = parseStoredRecord(stored);
        await table.put(storedRecord(current.resource, archived));
        return { ...current.resource, archived };
      });
    } catch (error) {
      rethrowRepositoryError(
        error,
        resourceRepositoryErrorCodes.transactionFailed,
        `Resource archive transaction failed: ${id}`
      );
    }
  }

  const archiveResource = (id) => setArchived(id, true);
  const restoreResource = (id) => setArchived(id, false);

  async function deleteResourcePermanently(id) {
    await ensureDatabaseOpen(database);
    try {
      const deleted = await database.transaction(
        "rw",
        [database.table("resources"), database.table("resourceMemory")],
        async () => {
          const table = database.table("resources");
          const stored = await table.get(id);
          if (!stored) return false;
          await table.delete(id);
          await database.table("resourceMemory").delete(id);
          return true;
        }
      );
      if (!deleted) {
        throw repositoryError(
          resourceRepositoryErrorCodes.resourceNotFound,
          `Resource not found: ${id}`,
          { details: { id } }
        );
      }
    } catch (error) {
      rethrowRepositoryError(
        error,
        resourceRepositoryErrorCodes.transactionFailed,
        `Resource deletion transaction failed: ${id}`
      );
    }
  }

  async function clearResourceDatabaseForTests() {
    if (!database.name.startsWith("therapy-studio-test-")) {
      throw repositoryError(
        resourceRepositoryErrorCodes.transactionFailed,
        "Refusing to clear a non-test Resource database."
      );
    }
    await ensureDatabaseOpen(database);
    try {
      await database.table("resources").clear();
    } catch (error) {
      rethrowRepositoryError(
        error,
        resourceRepositoryErrorCodes.transactionFailed,
        "Test Resource database could not be cleared."
      );
    }
  }

  return {
    getAllResources,
    getResourceById,
    createResourceRecord,
    createResourceRecords,
    updateResourceRecord,
    archiveResource,
    restoreResource,
    deleteResourcePermanently,
    clearResourceDatabaseForTests,
  };
}

let defaultRepository;

function getDefaultRepository() {
  defaultRepository ??= createResourceRepository();
  return defaultRepository;
}

function defaultOperation(name) {
  return (...arguments_) => getDefaultRepository()[name](...arguments_);
}

export const getAllResources = defaultOperation("getAllResources");
export const getResourceById = defaultOperation("getResourceById");
export const createResourceRecord = defaultOperation("createResourceRecord");
export const createResourceRecords = defaultOperation("createResourceRecords");
export const updateResourceRecord = defaultOperation("updateResourceRecord");
export const archiveResource = defaultOperation("archiveResource");
export const restoreResource = defaultOperation("restoreResource");
export const deleteResourcePermanently = defaultOperation("deleteResourcePermanently");
export const clearResourceDatabaseForTests = defaultOperation(
  "clearResourceDatabaseForTests"
);
