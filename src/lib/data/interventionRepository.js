import Dexie from "dexie";
import { nanoid } from "nanoid";

import {
  getInterventionById as getStarterIntervention,
  getInterventionGuidance as getStarterGuidance,
  interventions as starterInterventions,
} from "../../data/resources/interventions";
import { interventionGuidanceSchema, resourceSchema } from "../../models";
import { getTherapyStudioDatabase } from "./database";

export const interventionRepositoryErrorCodes = Object.freeze({
  invalidPair: "invalid-intervention-pair",
  conflict: "intervention-conflict",
  notFound: "intervention-not-found",
  protectedStarter: "protected-intervention-starter",
  databaseUnavailable: "database-unavailable",
  transactionFailed: "intervention-transaction-failed",
});

export class InterventionRepositoryError extends Error {
  constructor(code, message, { cause, details } = {}) {
    super(message, { cause });
    this.name = "InterventionRepositoryError";
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

function repositoryError(code, message, options) {
  return new InterventionRepositoryError(code, message, options);
}

function parseResource(input) {
  const result = resourceSchema.safeParse(input);
  if (!result.success || result.data.type !== "intervention") {
    throw repositoryError(
      interventionRepositoryErrorCodes.invalidPair,
      "Intervention Resource failed validation.",
      { cause: result.error, details: result.error?.issues }
    );
  }
  if (Object.keys(input).some((key) => !(key in result.data))) {
    throw repositoryError(
      interventionRepositoryErrorCodes.invalidPair,
      "Intervention Resource contains unsupported fields."
    );
  }
  return result.data;
}

function parseGuidance(input) {
  const result = interventionGuidanceSchema.safeParse(input);
  if (!result.success) {
    throw repositoryError(
      interventionRepositoryErrorCodes.invalidPair,
      "Intervention guidance failed validation.",
      { cause: result.error, details: result.error?.issues }
    );
  }
  return result.data;
}

function parsePair(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw repositoryError(
      interventionRepositoryErrorCodes.invalidPair,
      "Intervention import must contain a Resource and guidance."
    );
  }
  const resource = parseResource(input.resource);
  const guidance = parseGuidance(input.guidance);
  if (resource.id !== guidance.resourceId) {
    throw repositoryError(
      interventionRepositoryErrorCodes.invalidPair,
      `Intervention Resource and guidance IDs must match: ${resource.id}`
    );
  }
  return { resource, guidance };
}

async function ensureOpen(database) {
  if (database.isOpen()) return;
  try {
    await database.open();
  } catch (error) {
    if (error instanceof Dexie.MissingAPIError || error?.name === "MissingAPIError") {
      throw repositoryError(
        interventionRepositoryErrorCodes.databaseUnavailable,
        "Interventions are unavailable in this environment.",
        { cause: error }
      );
    }
    throw repositoryError(
      interventionRepositoryErrorCodes.transactionFailed,
      "Therapy Studio could not open Interventions.",
      { cause: error }
    );
  }
}

function publicResource(record) {
  if (!record || record.type !== "intervention" || typeof record.archived !== "boolean") {
    throw repositoryError(
      interventionRepositoryErrorCodes.invalidPair,
      "Stored Intervention is malformed."
    );
  }
  const { archived, ...resource } = record;
  return { ...parseResource(resource), archived };
}

export function createInterventionRepository({
  database = getTherapyStudioDatabase(),
  createId = () => nanoid(),
  now = () => new Date().toISOString(),
} = {}) {
  const resources = () => database.table("resources");
  const guidance = () => database.table("interventionGuidance");
  const memory = () => database.table("resourceMemory");

  async function getPersistedInterventions() {
    await ensureOpen(database);
    return (await resources().toArray())
      .filter((record) => record.type === "intervention")
      .map(publicResource)
      .sort(
        (left, right) =>
          left.title.localeCompare(right.title) || left.id.localeCompare(right.id)
      );
  }

  async function getAllInterventions({ includeArchived = false } = {}) {
    const persisted = (await getPersistedInterventions()).filter(
      (item) => includeArchived || !item.archived
    );
    return [
      ...starterInterventions.map((item) => ({
        ...item,
        archived: false,
        starter: true,
      })),
      ...persisted.map((item) => ({ ...item, starter: false })),
    ].sort(
      (left, right) =>
        left.title.localeCompare(right.title) || left.id.localeCompare(right.id)
    );
  }

  async function getInterventionById(id) {
    const starter = getStarterIntervention(id);
    if (starter) return { ...starter, archived: false, starter: true };
    await ensureOpen(database);
    const record = await resources().get(id);
    if (!record || record.type !== "intervention") {
      throw repositoryError(
        interventionRepositoryErrorCodes.notFound,
        `Intervention not found: ${id}`
      );
    }
    return { ...publicResource(record), starter: false };
  }

  async function getInterventionGuidance(id) {
    const starter = getStarterGuidance(id);
    if (starter) return structuredClone(starter);
    await getInterventionById(id);
    const record = await guidance().get(id);
    if (!record) {
      throw repositoryError(
        interventionRepositoryErrorCodes.notFound,
        `Intervention guidance not found: ${id}`
      );
    }
    return parseGuidance(record);
  }

  async function getInterventionPair(id) {
    const [resource, interventionGuidance] = await Promise.all([
      getInterventionById(id),
      getInterventionGuidance(id),
    ]);
    return { resource, guidance: interventionGuidance };
  }

  async function importInterventions(pairs) {
    if (!Array.isArray(pairs) || !pairs.length) {
      throw repositoryError(
        interventionRepositoryErrorCodes.invalidPair,
        "Import at least one Intervention."
      );
    }
    const validated = pairs.map(parsePair);
    const ids = validated.map(({ resource }) => resource.id);
    if (new Set(ids).size !== ids.length) {
      throw repositoryError(
        interventionRepositoryErrorCodes.invalidPair,
        "Intervention import contains duplicate IDs."
      );
    }
    const starterConflict = ids.find((id) => getStarterIntervention(id));
    if (starterConflict) {
      throw repositoryError(
        interventionRepositoryErrorCodes.conflict,
        `Intervention ID conflicts with a Therapy Studio starter: ${starterConflict}`
      );
    }

    await ensureOpen(database);
    try {
      await database.transaction("rw", [resources(), guidance()], async () => {
        for (const id of ids) {
          if (await resources().get(id)) {
            throw repositoryError(
              interventionRepositoryErrorCodes.conflict,
              `Resource ID already exists: ${id}`,
              { details: { id } }
            );
          }
        }
        await resources().bulkAdd(
          validated.map(({ resource }) => ({ ...resource, archived: false }))
        );
        await guidance().bulkAdd(validated.map((pair) => pair.guidance));
      });
      return validated;
    } catch (error) {
      if (error instanceof InterventionRepositoryError) throw error;
      if (error instanceof Dexie.ConstraintError || error?.name === "ConstraintError") {
        throw repositoryError(
          interventionRepositoryErrorCodes.conflict,
          "An Intervention or Resource ID already exists.",
          { cause: error }
        );
      }
      throw repositoryError(
        interventionRepositoryErrorCodes.transactionFailed,
        "Interventions could not be imported.",
        { cause: error }
      );
    }
  }

  const createIntervention = (pair) =>
    importInterventions([pair]).then(([created]) => created);

  async function updateIntervention(id, pair) {
    if (getStarterIntervention(id)) {
      throw repositoryError(
        interventionRepositoryErrorCodes.protectedStarter,
        "Therapy Studio starter Interventions cannot be edited."
      );
    }
    const validated = parsePair(pair);
    if (validated.resource.id !== id) {
      throw repositoryError(
        interventionRepositoryErrorCodes.invalidPair,
        "Intervention identity cannot be changed."
      );
    }
    await getInterventionById(id);
    await database.transaction("rw", [resources(), guidance()], async () => {
      const current = await resources().get(id);
      await resources().put({ ...validated.resource, archived: current.archived });
      await guidance().put(validated.guidance);
    });
    return validated;
  }

  async function deleteInterventionPermanently(id) {
    if (getStarterIntervention(id)) {
      throw repositoryError(
        interventionRepositoryErrorCodes.protectedStarter,
        "Therapy Studio starter Interventions cannot be deleted."
      );
    }
    await getInterventionById(id);
    await database.transaction("rw", [resources(), guidance(), memory()], async () => {
      await resources().delete(id);
      await guidance().delete(id);
      await memory().delete(id);
    });
  }

  async function duplicateIntervention(id) {
    const { resource, guidance: sourceGuidance } = await getInterventionPair(id);
    const copyId = createId();
    const timestamp = now();
    const {
      starter,
      archived,
      id: ignoredId,
      createdAt,
      updatedAt,
      ...details
    } = resource;
    void starter;
    void archived;
    void ignoredId;
    void createdAt;
    void updatedAt;
    return createIntervention({
      resource: {
        ...details,
        id: copyId,
        type: "intervention",
        title: `${resource.title} Copy`,
        createdAt: timestamp,
        updatedAt: timestamp,
        usageCount: 0,
        lastUsedAt: null,
        favorite: false,
        rating: null,
      },
      guidance: {
        ...sourceGuidance,
        resourceId: copyId,
      },
    });
  }

  return {
    createIntervention,
    deleteInterventionPermanently,
    duplicateIntervention,
    getAllInterventions,
    getInterventionById,
    getInterventionGuidance,
    getInterventionPair,
    importInterventions,
    updateIntervention,
  };
}

export const interventionRepository = createInterventionRepository();
