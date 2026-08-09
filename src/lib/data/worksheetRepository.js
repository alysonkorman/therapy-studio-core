import Dexie from "dexie";
import { nanoid } from "nanoid";

import {
  getWorksheetStarterDocument,
  isWorksheetStarter,
  worksheetStarters,
} from "../../data/resources/worksheetStarters";
import { applyWorksheetStarter } from "../../engines/worksheets/worksheetStarterLayouts";
import {
  createBlankWorksheetDocument,
  createWorksheetResource,
  worksheetDocumentSchema,
  worksheetSchema,
} from "../../models";
import { getTherapyStudioDatabase } from "./database";

export const worksheetRepositoryErrorCodes = Object.freeze({
  duplicateWorksheet: "duplicate-worksheet",
  worksheetNotFound: "worksheet-not-found",
  documentNotFound: "document-not-found",
  invalidDocument: "invalid-document",
  malformedStoredWorksheet: "malformed-stored-worksheet",
  malformedStoredDocument: "malformed-stored-document",
  databaseUnavailable: "database-unavailable",
  transactionFailed: "transaction-failed",
  writeFailed: "write-failed",
  protectedStarter: "protected-starter",
});

export class WorksheetRepositoryError extends Error {
  constructor(code, message, { cause, details } = {}) {
    super(message, { cause });
    this.name = "WorksheetRepositoryError";
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

const repositoryError = (code, message, options) =>
  new WorksheetRepositoryError(code, message, options);

async function ensureOpen(database) {
  if (database.isOpen()) return;
  try {
    await database.open();
  } catch (error) {
    if (error instanceof Dexie.MissingAPIError || error?.name === "MissingAPIError") {
      throw repositoryError(
        worksheetRepositoryErrorCodes.databaseUnavailable,
        "Worksheets are unavailable in this environment.",
        { cause: error }
      );
    }
    throw repositoryError(
      worksheetRepositoryErrorCodes.transactionFailed,
      "Therapy Studio could not open Worksheets.",
      { cause: error }
    );
  }
}

function parseWorksheet(
  record,
  code = worksheetRepositoryErrorCodes.malformedStoredWorksheet
) {
  if (!record || typeof record.archived !== "boolean") {
    throw repositoryError(code, "Stored Worksheet is malformed.");
  }
  const { archived, ...resource } = record;
  const result = worksheetSchema.safeParse(resource);
  if (!result.success) {
    throw repositoryError(code, "Worksheet failed validation.", {
      cause: result.error,
      details: result.error.issues,
    });
  }
  return { ...result.data, archived };
}

function parseDocument(document, code = worksheetRepositoryErrorCodes.invalidDocument) {
  const result = worksheetDocumentSchema.safeParse(document);
  if (!result.success) {
    throw repositoryError(code, "Worksheet document failed validation.", {
      cause: result.error,
      details: result.error.issues,
    });
  }
  return result.data;
}

function copyStarter(value) {
  return structuredClone(value);
}

export function createWorksheetRepository({
  database = getTherapyStudioDatabase(),
  now = () => new Date().toISOString(),
  createId = () => nanoid(),
} = {}) {
  const resources = () => database.table("resources");
  const documents = () => database.table("worksheetDocuments");

  async function getAllWorksheets({ includeArchived = false } = {}) {
    await ensureOpen(database);
    const stored = (await resources().toArray())
      .filter((record) => record.type === "worksheet")
      .map(parseWorksheet)
      .filter((worksheet) => includeArchived || !worksheet.archived);
    return [
      ...worksheetStarters.map((worksheet) => ({
        ...copyStarter(worksheet),
        archived: false,
      })),
      ...stored,
    ].sort(
      (left, right) =>
        left.title.localeCompare(right.title) || left.id.localeCompare(right.id)
    );
  }

  async function getWorksheetById(id) {
    if (isWorksheetStarter(id)) {
      return {
        ...copyStarter(worksheetStarters.find((worksheet) => worksheet.id === id)),
        archived: false,
      };
    }
    await ensureOpen(database);
    const record = await resources().get(id);
    if (!record || record.type !== "worksheet") {
      throw repositoryError(
        worksheetRepositoryErrorCodes.worksheetNotFound,
        `Worksheet not found: ${id}`
      );
    }
    return parseWorksheet(record);
  }

  async function getWorksheetDocument(worksheetId) {
    const starterDocument = getWorksheetStarterDocument(worksheetId);
    if (starterDocument) return copyStarter(starterDocument);
    await getWorksheetById(worksheetId);
    const record = await documents().get(worksheetId);
    if (!record) {
      throw repositoryError(
        worksheetRepositoryErrorCodes.documentNotFound,
        `Worksheet document not found: ${worksheetId}`
      );
    }
    return parseDocument(record, worksheetRepositoryErrorCodes.malformedStoredDocument);
  }

  async function createWorksheet(input) {
    await ensureOpen(database);
    const timestamp = now();
    const id = createId();
    const { starterId = "blank", ...resourceInput } = input;
    const resource = createWorksheetResource(resourceInput, { id, now: timestamp });
    let document = createBlankWorksheetDocument(id, {
      createId,
      now: timestamp,
    });
    document = parseDocument(applyWorksheetStarter(document, starterId, createId));
    try {
      await database.transaction("rw", [resources(), documents()], async () => {
        await resources().add({ ...resource, archived: false });
        await documents().add(document);
      });
      return { resource: { ...resource, archived: false }, document };
    } catch (error) {
      if (error instanceof Dexie.ConstraintError || error?.name === "ConstraintError") {
        throw repositoryError(
          worksheetRepositoryErrorCodes.duplicateWorksheet,
          `Worksheet already exists: ${id}`,
          { cause: error }
        );
      }
      if (error instanceof WorksheetRepositoryError) throw error;
      throw repositoryError(
        worksheetRepositoryErrorCodes.writeFailed,
        "Worksheet could not be created.",
        { cause: error }
      );
    }
  }

  async function saveWorksheetDocument(worksheetId, input) {
    if (isWorksheetStarter(worksheetId)) {
      throw repositoryError(
        worksheetRepositoryErrorCodes.protectedStarter,
        "Duplicate this Therapy Studio starter before editing it."
      );
    }
    const worksheet = await getWorksheetById(worksheetId);
    const current = await getWorksheetDocument(worksheetId);
    const timestamp = now();
    const document = parseDocument({
      ...input,
      worksheetId,
      createdAt: current.createdAt,
      updatedAt: timestamp,
    });
    try {
      await database.transaction("rw", [resources(), documents()], async () => {
        await documents().put(document);
        const { archived, ...resource } = worksheet;
        await resources().put({ ...resource, updatedAt: timestamp, archived });
      });
      return document;
    } catch (error) {
      if (error instanceof WorksheetRepositoryError) throw error;
      throw repositoryError(
        worksheetRepositoryErrorCodes.writeFailed,
        "Worksheet could not be saved.",
        { cause: error }
      );
    }
  }

  async function setArchived(id, archived) {
    if (isWorksheetStarter(id)) {
      throw repositoryError(
        worksheetRepositoryErrorCodes.protectedStarter,
        "Therapy Studio starters cannot be archived."
      );
    }
    const worksheet = await getWorksheetById(id);
    const { archived: ignored, ...resource } = worksheet;
    void ignored;
    const updated = { ...resource, updatedAt: now(), archived };
    await resources().put(updated);
    return parseWorksheet(updated);
  }

  async function deleteWorksheetPermanently(id) {
    if (isWorksheetStarter(id)) {
      throw repositoryError(
        worksheetRepositoryErrorCodes.protectedStarter,
        "Therapy Studio starters cannot be deleted."
      );
    }
    await getWorksheetById(id);
    await database.transaction("rw", [resources(), documents()], async () => {
      await resources().delete(id);
      await documents().delete(id);
    });
  }

  async function duplicateWorksheet(sourceId) {
    await ensureOpen(database);
    const source = await getWorksheetById(sourceId);
    const sourceDocument = await getWorksheetDocument(sourceId);
    const timestamp = now();
    const id = createId();
    const { archived: ignored, ...sourceResource } = source;
    void ignored;
    const resource = worksheetSchema.parse({
      ...sourceResource,
      id,
      title: `${source.title} Copy`,
      attribution: "",
      provenance: `duplicated-from:${sourceId}`,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const document = parseDocument({
      ...copyStarter(sourceDocument),
      worksheetId: id,
      pages: sourceDocument.pages.map((page, pageIndex) => ({
        ...copyStarter(page),
        id: createId(),
        sortOrder: pageIndex,
        blocks: page.blocks.map((worksheetBlock, blockIndex) => ({
          ...copyStarter(worksheetBlock),
          id: createId(),
          sortOrder: blockIndex,
        })),
      })),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    try {
      await database.transaction("rw", [resources(), documents()], async () => {
        await resources().add({ ...resource, archived: false });
        await documents().add(document);
      });
      return { resource: { ...resource, archived: false }, document };
    } catch (error) {
      if (error instanceof Dexie.ConstraintError || error?.name === "ConstraintError") {
        throw repositoryError(
          worksheetRepositoryErrorCodes.duplicateWorksheet,
          `Worksheet already exists: ${id}`,
          { cause: error }
        );
      }
      throw repositoryError(
        worksheetRepositoryErrorCodes.writeFailed,
        "Worksheet could not be duplicated.",
        { cause: error }
      );
    }
  }

  return {
    getAllWorksheets,
    getWorksheetById,
    getWorksheetDocument,
    createWorksheet,
    duplicateWorksheet,
    saveWorksheetDocument,
    archiveWorksheet: (id) => setArchived(id, true),
    restoreWorksheet: (id) => setArchived(id, false),
    deleteWorksheetPermanently,
  };
}

export const worksheetRepository = createWorksheetRepository();
