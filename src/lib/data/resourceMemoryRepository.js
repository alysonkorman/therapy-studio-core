import Dexie from "dexie";

import { resources as staticResources } from "../../data/resources";
import { createDefaultResourceMemory, resourceMemorySchema } from "../../models";
import { getTherapyStudioDatabase } from "./database";

export const resourceMemoryErrorCodes = Object.freeze({
  resourceNotFound: "resource-not-found",
  invalidMemory: "invalid-memory",
  invalidRating: "invalid-rating",
  invalidUpdate: "invalid-update",
  malformedStoredMemory: "malformed-stored-memory",
  databaseUnavailable: "database-unavailable",
  databaseOpenFailed: "database-open-failed",
  transactionFailed: "transaction-failed",
  writeFailed: "write-failed",
});

export class ResourceMemoryRepositoryError extends Error {
  constructor(code, message, { cause, details } = {}) {
    super(message, { cause });
    this.name = "ResourceMemoryRepositoryError";
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

function memoryError(code, message, options) {
  return new ResourceMemoryRepositoryError(code, message, options);
}

function isMissingApiError(error) {
  return (
    error instanceof Dexie.MissingAPIError ||
    error?.name === "MissingAPIError" ||
    /IndexedDB API missing/i.test(error?.message ?? "")
  );
}

async function ensureOpen(database) {
  if (database.isOpen()) return;
  try {
    await database.open();
  } catch (error) {
    if (isMissingApiError(error)) {
      throw memoryError(
        resourceMemoryErrorCodes.databaseUnavailable,
        "Resource Memory is unavailable in this environment.",
        { cause: error }
      );
    }
    throw memoryError(
      resourceMemoryErrorCodes.databaseOpenFailed,
      "Therapy Studio could not open Resource Memory.",
      { cause: error }
    );
  }
}

function rethrow(error, code, message) {
  if (error instanceof ResourceMemoryRepositoryError) throw error;
  throw memoryError(code, message, { cause: error });
}

function parseMemory(input, code = resourceMemoryErrorCodes.invalidMemory) {
  const result = resourceMemorySchema.safeParse(input);
  if (!result.success) {
    throw memoryError(code, "Resource Memory failed validation.", {
      cause: result.error,
      details: result.error.issues,
    });
  }
  return result.data;
}

function parseStoredMemory(input) {
  try {
    return parseMemory(input, resourceMemoryErrorCodes.malformedStoredMemory);
  } catch (error) {
    rethrow(
      error,
      resourceMemoryErrorCodes.malformedStoredMemory,
      "Stored Resource Memory is malformed."
    );
  }
}

const staticResourceMap = new Map(
  staticResources.map((resource) => [resource.id, resource])
);

export function createResourceMemoryRepository({
  database = getTherapyStudioDatabase(),
  now = () => new Date().toISOString(),
} = {}) {
  async function getKnownResource(resourceId) {
    await ensureOpen(database);
    try {
      const stored = await database.table("resources").get(resourceId);
      if (stored) {
        const resource = { ...stored };
        delete resource.archived;
        return resource;
      }
      const resource = staticResourceMap.get(resourceId);
      if (resource) return resource;
      throw memoryError(
        resourceMemoryErrorCodes.resourceNotFound,
        `Resource not found: ${resourceId}`,
        { details: { resourceId } }
      );
    } catch (error) {
      rethrow(
        error,
        resourceMemoryErrorCodes.transactionFailed,
        `Resource could not be verified: ${resourceId}`
      );
    }
  }

  async function getResourceMemory(resourceId) {
    await getKnownResource(resourceId);
    try {
      const stored = await database.table("resourceMemory").get(resourceId);
      return stored
        ? parseStoredMemory(stored)
        : createDefaultResourceMemory(resourceId, now());
    } catch (error) {
      rethrow(
        error,
        resourceMemoryErrorCodes.transactionFailed,
        `Resource Memory could not be read: ${resourceId}`
      );
    }
  }

  async function getResourceMemoryMap(resourceIds) {
    await ensureOpen(database);
    try {
      if (!resourceIds) {
        const records = await database.table("resourceMemory").toArray();
        return new Map(
          records.map((record) => [record.resourceId, parseStoredMemory(record)])
        );
      }
      const entries = await Promise.all(
        [...new Set(resourceIds)].map(async (resourceId) => [
          resourceId,
          await getResourceMemory(resourceId),
        ])
      );
      return new Map(entries);
    } catch (error) {
      rethrow(
        error,
        resourceMemoryErrorCodes.transactionFailed,
        "Resource Memory collection could not be read."
      );
    }
  }

  async function mutate(resourceId, change, message) {
    await getKnownResource(resourceId);
    try {
      return await database.transaction(
        "rw",
        database.table("resourceMemory"),
        async () => {
          const table = database.table("resourceMemory");
          const stored = await table.get(resourceId);
          const timestamp = now();
          const current = stored
            ? parseStoredMemory(stored)
            : createDefaultResourceMemory(resourceId, timestamp);
          const next = parseMemory({
            ...current,
            ...change(current),
            resourceId,
            createdAt: current.createdAt,
            updatedAt: timestamp,
          });
          await table.put(next);
          return next;
        }
      );
    } catch (error) {
      rethrow(error, resourceMemoryErrorCodes.writeFailed, message);
    }
  }

  function upsertResourceMemory(resourceId, changes) {
    if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
      throw memoryError(
        resourceMemoryErrorCodes.invalidUpdate,
        "Resource Memory update must be an object."
      );
    }
    if (["resourceId", "createdAt", "updatedAt"].some((field) => field in changes)) {
      throw memoryError(
        resourceMemoryErrorCodes.invalidUpdate,
        "Resource Memory identity and lifecycle fields cannot be changed directly."
      );
    }
    return mutate(resourceId, () => changes, "Resource Memory could not be saved.");
  }

  const toggleFavorite = (resourceId) =>
    mutate(
      resourceId,
      (memory) => ({ favorite: !memory.favorite }),
      "Favorite could not be updated."
    );

  async function setRating(resourceId, rating) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw memoryError(resourceMemoryErrorCodes.invalidRating, "Rating must be 1–5.");
    }
    return mutate(resourceId, () => ({ rating }), "Rating could not be saved.");
  }

  const clearRating = (resourceId) =>
    mutate(resourceId, () => ({ rating: null }), "Rating could not be cleared.");
  const updateTherapistNotes = (resourceId, therapistNotes) =>
    mutate(resourceId, () => ({ therapistNotes }), "Private notes could not be saved.");
  const updateWorksWellWhen = (resourceId, worksWellWhen) =>
    mutate(resourceId, () => ({ worksWellWhen }), "Works Well When could not be saved.");
  const updateKidsWhoUsuallyLikeThis = (resourceId, kidsWhoUsuallyLikeThis) =>
    mutate(
      resourceId,
      () => ({ kidsWhoUsuallyLikeThis }),
      "Kids Who Usually Like This could not be saved."
    );
  const updateAdaptations = (resourceId, adaptations) =>
    mutate(resourceId, () => ({ adaptations }), "Adaptations could not be saved.");
  const markResourceUsed = (resourceId, usedAt = now()) =>
    mutate(
      resourceId,
      (memory) => ({ useCount: memory.useCount + 1, lastUsedAt: usedAt }),
      "Recent use could not be saved."
    );

  async function joinedMemories(predicate, compare, { limit } = {}) {
    await ensureOpen(database);
    try {
      const memories = (await database.table("resourceMemory").toArray())
        .map(parseStoredMemory)
        .filter(predicate)
        .sort(compare);
      const selected = Number.isInteger(limit) ? memories.slice(0, limit) : memories;
      return Promise.all(
        selected.map(async (memory) => ({
          memory,
          resource: await getKnownResource(memory.resourceId),
        }))
      );
    } catch (error) {
      rethrow(
        error,
        resourceMemoryErrorCodes.transactionFailed,
        "Resource Memory collection could not be read."
      );
    }
  }

  const idTieBreak = (left, right) => left.resourceId.localeCompare(right.resourceId);
  const getFavoriteResources = (options) =>
    joinedMemories((memory) => memory.favorite, idTieBreak, options);
  const getRecentlyUsedResources = (options) =>
    joinedMemories(
      (memory) => memory.lastUsedAt !== null,
      (left, right) =>
        right.lastUsedAt.localeCompare(left.lastUsedAt) || idTieBreak(left, right),
      options
    );
  const getMostUsedResources = (options) =>
    joinedMemories(
      (memory) => memory.useCount > 0,
      (left, right) =>
        right.useCount - left.useCount ||
        String(right.lastUsedAt ?? "").localeCompare(String(left.lastUsedAt ?? "")) ||
        idTieBreak(left, right),
      options
    );
  const getHighestRatedResources = (options) =>
    joinedMemories(
      (memory) => memory.rating !== null,
      (left, right) =>
        right.rating - left.rating ||
        right.useCount - left.useCount ||
        idTieBreak(left, right),
      options
    );

  async function deleteResourceMemoryPermanently(resourceId) {
    await getKnownResource(resourceId);
    try {
      await database.table("resourceMemory").delete(resourceId);
    } catch (error) {
      rethrow(
        error,
        resourceMemoryErrorCodes.writeFailed,
        "Resource Memory could not be deleted."
      );
    }
  }

  async function clearResourceMemoryForTests() {
    if (!database.name.startsWith("therapy-studio-test-")) {
      throw memoryError(
        resourceMemoryErrorCodes.transactionFailed,
        "Refusing to clear a non-test Resource Memory database."
      );
    }
    await ensureOpen(database);
    await database.table("resourceMemory").clear();
  }

  return {
    getResourceMemory,
    getResourceMemoryMap,
    upsertResourceMemory,
    toggleFavorite,
    setRating,
    clearRating,
    updateTherapistNotes,
    updateWorksWellWhen,
    updateKidsWhoUsuallyLikeThis,
    updateAdaptations,
    markResourceUsed,
    getFavoriteResources,
    getRecentlyUsedResources,
    getMostUsedResources,
    getHighestRatedResources,
    deleteResourceMemoryPermanently,
    clearResourceMemoryForTests,
  };
}

export const resourceMemoryRepository = createResourceMemoryRepository();
