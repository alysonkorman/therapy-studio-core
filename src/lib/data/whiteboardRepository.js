import Dexie from "dexie";
import { nanoid } from "nanoid";

import { createBlankWhiteboardDocument, whiteboardDocumentSchema } from "../../models";
import { getTherapyStudioDatabase } from "./database";

async function ensureOpen(database) {
  if (database.isOpen()) return;
  try {
    await database.open();
  } catch (error) {
    if (error instanceof Dexie.MissingAPIError || error?.name === "MissingAPIError") {
      throw new Error("Saved Whiteboards are unavailable in this environment.", {
        cause: error,
      });
    }
    throw error;
  }
}

export function createWhiteboardRepository({
  database = getTherapyStudioDatabase(),
  createId = () => nanoid(),
  now = () => new Date().toISOString(),
} = {}) {
  const table = () => database.table("whiteboardDocuments");
  return {
    async createWhiteboard(title = "Untitled Whiteboard") {
      await ensureOpen(database);
      const document = createBlankWhiteboardDocument({
        id: createId(),
        now: now(),
        title,
      });
      await table().add(document);
      return structuredClone(document);
    },
    async listWhiteboards() {
      await ensureOpen(database);
      const records = await table().orderBy("updatedAt").reverse().toArray();
      return records.map((record) => whiteboardDocumentSchema.parse(record));
    },
    async getWhiteboard(id) {
      await ensureOpen(database);
      const record = await table().get(id);
      if (!record) throw new Error(`Whiteboard not found: ${id}`);
      return whiteboardDocumentSchema.parse(record);
    },
    async saveWhiteboard(document) {
      await ensureOpen(database);
      const existing = await table().get(document.id);
      const saved = whiteboardDocumentSchema.parse({
        ...document,
        createdAt: existing?.createdAt ?? document.createdAt,
        updatedAt: now(),
      });
      await table().put(saved);
      return structuredClone(saved);
    },
  };
}

export const whiteboardRepository = createWhiteboardRepository();
