import Dexie from "dexie";

import {
  promptCategorySchema,
  interventionGuidanceSchema,
  promptDeckSchema,
  promptPlaylistSchema,
  resourceMemorySchema,
  resourceSchema,
  triviaGameSchema,
  sessionProfileSchema,
  therapyStudioBackupEnvelopeSchema,
  THERAPY_STUDIO_BACKUP_FORMAT,
  THERAPY_STUDIO_BACKUP_VERSION,
  worksheetDocumentSchema,
  worksheetSchema,
  whiteboardDocumentSchema,
} from "../../models";
import { localMediaBackupAssetSchema } from "../../models/localMediaAsset";
import {
  getTherapyStudioDatabase,
  THERAPY_STUDIO_DATABASE_LATEST_VERSION,
} from "./database";

const tableNames = [
  "resources",
  "categories",
  "playlists",
  "resourceMemory",
  "sessionProfiles",
  "worksheetDocuments",
  "interventionGuidance",
  "whiteboardDocuments",
  "localMediaAssets",
];

function bytesToBase64(data) {
  const bytes = new Uint8Array(data);
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary);
}

function base64ToBlob(dataBase64, mimeType) {
  const binary = atob(dataBase64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

export const backupErrorCodes = Object.freeze({
  invalidJson: "invalid-json",
  wrongFormat: "wrong-format",
  unsupportedVersion: "unsupported-version",
  invalidBackup: "invalid-backup",
  duplicateId: "duplicate-id",
  worksheetMismatch: "worksheet-mismatch",
  interventionMismatch: "intervention-mismatch",
  databaseUnavailable: "database-unavailable",
  transactionFailed: "transaction-failed",
});

export class BackupRepositoryError extends Error {
  constructor(code, message, { cause, details } = {}) {
    super(message, { cause });
    this.name = "BackupRepositoryError";
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

function backupError(code, message, options) {
  return new BackupRepositoryError(code, message, options);
}

function schemaForResource(resource) {
  if (resource?.type === "prompt-deck") return promptDeckSchema;
  if (resource?.type === "worksheet") return worksheetSchema;
  if (resource?.type === "game") return triviaGameSchema;
  return resourceSchema;
}

function parseStrict(schema, input, label) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw backupError(backupErrorCodes.invalidBackup, `${label} is invalid.`);
  }
  const result = schema.safeParse(input);
  const hasUnknownFields =
    result.success && Object.keys(input).some((key) => !(key in result.data));
  if (!result.success || hasUnknownFields) {
    throw backupError(
      backupErrorCodes.invalidBackup,
      `The backup contains an invalid ${label}.`,
      { cause: result.error, details: result.error?.issues }
    );
  }
  return result.data;
}

function parseStoredResource(record) {
  if (!record || typeof record.archived !== "boolean") {
    throw backupError(
      backupErrorCodes.invalidBackup,
      "The backup contains an invalid Resource."
    );
  }
  const { archived, ...resource } = record;
  return {
    ...parseStrict(schemaForResource(resource), resource, "Resource"),
    archived,
  };
}

function assertUnique(records, key, collection) {
  const seen = new Set();
  for (const record of records) {
    const id = record[key];
    if (seen.has(id)) {
      throw backupError(
        backupErrorCodes.duplicateId,
        `The backup contains duplicate records in ${collection}.`,
        { details: { collection, id } }
      );
    }
    seen.add(id);
  }
}

function sorted(records, key) {
  return [...records].sort((left, right) =>
    String(left[key]).localeCompare(String(right[key]))
  );
}

function validateWorksheetPairs(data) {
  const worksheetIds = new Set(
    data.resources
      .filter((resource) => resource.type === "worksheet")
      .map((resource) => resource.id)
  );
  const documentIds = new Set(
    data.worksheetDocuments.map(({ worksheetId }) => worksheetId)
  );
  const missingDocument = [...worksheetIds].find((id) => !documentIds.has(id));
  const orphanDocument = [...documentIds].find((id) => !worksheetIds.has(id));
  if (missingDocument || orphanDocument) {
    throw backupError(
      backupErrorCodes.worksheetMismatch,
      "The backup has incomplete Worksheet data and cannot be restored.",
      { details: { missingDocument, orphanDocument } }
    );
  }
}

function validateInterventionPairs(data) {
  const interventionIds = new Set(
    data.resources
      .filter((resource) => resource.type === "intervention")
      .map((resource) => resource.id)
  );
  const guidanceIds = new Set(
    data.interventionGuidance.map(({ resourceId }) => resourceId)
  );
  const missingGuidance = [...interventionIds].find((id) => !guidanceIds.has(id));
  const orphanGuidance = [...guidanceIds].find((id) => !interventionIds.has(id));
  if (missingGuidance || orphanGuidance) {
    throw backupError(
      backupErrorCodes.interventionMismatch,
      "The backup has incomplete imported Intervention data and cannot be restored.",
      { details: { missingGuidance, orphanGuidance } }
    );
  }
}

export function validateBackup(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw backupError(
      backupErrorCodes.invalidBackup,
      "This file is not a Therapy Studio backup."
    );
  }
  if (input.format !== THERAPY_STUDIO_BACKUP_FORMAT) {
    throw backupError(
      backupErrorCodes.wrongFormat,
      "This file is not a Therapy Studio backup."
    );
  }
  if (input.version !== THERAPY_STUDIO_BACKUP_VERSION) {
    throw backupError(
      backupErrorCodes.unsupportedVersion,
      "This backup version is not supported by this version of Therapy Studio."
    );
  }

  const envelope = parseStrict(therapyStudioBackupEnvelopeSchema, input, "backup file");
  const data = {
    resources: envelope.data.resources.map(parseStoredResource),
    categories: envelope.data.categories.map((record) =>
      parseStrict(promptCategorySchema, record, "category")
    ),
    playlists: envelope.data.playlists.map((record) =>
      parseStrict(promptPlaylistSchema, record, "playlist")
    ),
    resourceMemory: envelope.data.resourceMemory.map((record) =>
      parseStrict(resourceMemorySchema, record, "Resource Memory record")
    ),
    sessionProfiles: envelope.data.sessionProfiles.map((record) =>
      parseStrict(sessionProfileSchema, record, "Session Profile")
    ),
    worksheetDocuments: envelope.data.worksheetDocuments.map((record) =>
      parseStrict(worksheetDocumentSchema, record, "Worksheet document")
    ),
    interventionGuidance: envelope.data.interventionGuidance.map((record) =>
      parseStrict(interventionGuidanceSchema, record, "Intervention guidance")
    ),
    whiteboardDocuments: envelope.data.whiteboardDocuments.map((record) =>
      parseStrict(whiteboardDocumentSchema, record, "Whiteboard document")
    ),
    localMediaAssets: envelope.data.localMediaAssets.map((record) =>
      parseStrict(localMediaBackupAssetSchema, record, "local media asset")
    ),
  };

  assertUnique(data.resources, "id", "Resources");
  assertUnique(data.categories, "id", "categories");
  assertUnique(data.playlists, "id", "playlists");
  assertUnique(data.resourceMemory, "resourceId", "Resource Memory");
  assertUnique(data.sessionProfiles, "id", "Session Profiles");
  assertUnique(data.worksheetDocuments, "worksheetId", "Worksheet documents");
  assertUnique(data.interventionGuidance, "resourceId", "Intervention guidance");
  assertUnique(data.whiteboardDocuments, "id", "Whiteboard documents");
  assertUnique(data.localMediaAssets, "id", "local media assets");
  validateWorksheetPairs(data);
  validateInterventionPairs(data);

  return {
    ...envelope,
    data: {
      resources: sorted(data.resources, "id"),
      categories: sorted(data.categories, "id"),
      playlists: sorted(data.playlists, "id"),
      resourceMemory: sorted(data.resourceMemory, "resourceId"),
      sessionProfiles: sorted(data.sessionProfiles, "id"),
      worksheetDocuments: sorted(data.worksheetDocuments, "worksheetId"),
      interventionGuidance: sorted(data.interventionGuidance, "resourceId"),
      whiteboardDocuments: sorted(data.whiteboardDocuments, "id"),
      localMediaAssets: sorted(data.localMediaAssets, "id"),
    },
  };
}

export function parseBackupJson(json) {
  let input;
  try {
    input = JSON.parse(json);
  } catch (error) {
    throw backupError(
      backupErrorCodes.invalidJson,
      "Therapy Studio could not read this backup file.",
      { cause: error }
    );
  }
  return validateBackup(input);
}

async function ensureOpen(database) {
  if (database.isOpen()) return;
  try {
    await database.open();
  } catch (error) {
    if (error instanceof Dexie.MissingAPIError || error?.name === "MissingAPIError") {
      throw backupError(
        backupErrorCodes.databaseUnavailable,
        "Local Therapy Studio data is unavailable in this browser.",
        { cause: error }
      );
    }
    throw backupError(
      backupErrorCodes.transactionFailed,
      "Therapy Studio could not open local data.",
      { cause: error }
    );
  }
}

export function createBackupRepository({
  database = getTherapyStudioDatabase(),
  now = () => new Date().toISOString(),
} = {}) {
  const tables = () => tableNames.map((name) => database.table(name));

  async function exportBackup() {
    await ensureOpen(database);
    try {
      const values = await database.transaction("r", tables(), () =>
        Promise.all(tables().map((table) => table.toArray()))
      );
      const data = Object.fromEntries(
        tableNames.map((name, index) => [name, values[index]])
      );
      data.localMediaAssets = await Promise.all(
        data.localMediaAssets.map(async ({ data: bytes, ...metadata }) => ({
          ...metadata,
          dataBase64: bytesToBase64(bytes),
        }))
      );
      return validateBackup({
        format: THERAPY_STUDIO_BACKUP_FORMAT,
        version: THERAPY_STUDIO_BACKUP_VERSION,
        exportedAt: now(),
        databaseVersion: THERAPY_STUDIO_DATABASE_LATEST_VERSION,
        data,
      });
    } catch (error) {
      if (error instanceof BackupRepositoryError) throw error;
      throw backupError(
        backupErrorCodes.transactionFailed,
        "Therapy Studio could not create a backup.",
        { cause: error }
      );
    }
  }

  async function restoreBackup(input) {
    const backup = validateBackup(input);
    await ensureOpen(database);
    try {
      await database.transaction("rw", tables(), async () => {
        for (const table of tables()) await table.clear();
        for (const name of tableNames) {
          if (backup.data[name].length) {
            const records =
              name === "localMediaAssets"
                ? await Promise.all(
                    backup.data[name].map(async ({ dataBase64, ...metadata }) => ({
                      ...metadata,
                      data: await base64ToBlob(
                        dataBase64,
                        metadata.mimeType
                      ).arrayBuffer(),
                    }))
                  )
                : backup.data[name];
            await database.table(name).bulkAdd(records);
          }
        }
      });
      return {
        exportedAt: backup.exportedAt,
        counts: Object.fromEntries(
          tableNames.map((name) => [name, backup.data[name].length])
        ),
      };
    } catch (error) {
      if (error instanceof BackupRepositoryError) throw error;
      throw backupError(
        backupErrorCodes.transactionFailed,
        "Therapy Studio could not restore this backup. Your existing data was kept.",
        { cause: error }
      );
    }
  }

  return { exportBackup, restoreBackup };
}

export const backupRepository = createBackupRepository();
