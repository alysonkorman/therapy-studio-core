import Dexie from "dexie";
import { nanoid } from "nanoid";
import { z } from "zod";

import { getTherapyStudioDatabase } from "../../lib/data/database";

const workspaceObjectSchema = z
  .object({
    id: z.string().min(1),
    assetId: z.string().min(1),
    assetKind: z.string().min(1),
    label: z.string().min(1),
    symbol: z.string().optional(),
    color: z.string().optional(),
    text: z.string().optional(),
    shape: z.enum(["rectangle", "circle"]).optional(),
    locked: z.boolean().optional(),
    flipX: z.boolean().optional(),
    flipY: z.boolean().optional(),
    points: z.array(z.tuple([z.number().finite(), z.number().finite()])).optional(),
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().positive().finite(),
    height: z.number().positive().finite(),
    rotation: z.number().finite(),
  })
  .strict();

export const savedSceneDocumentSchema = z
  .object({
    id: z.string().min(1),
    documentVersion: z.literal(1),
    title: z.string().trim().min(1).max(120),
    kind: z.enum(["scene", "template"]).default("scene"),
    workspaceDocument: z
      .object({
        documentVersion: z.literal(1),
        background: z.string().min(1),
        objects: z.array(workspaceObjectSchema),
      })
      .strict(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

async function ensureOpen(database) {
  if (database.isOpen()) return;
  try {
    await database.open();
  } catch (error) {
    if (error instanceof Dexie.MissingAPIError || error?.name === "MissingAPIError") {
      throw new Error("Saved scenes are unavailable in this environment.", {
        cause: error,
      });
    }
    throw error;
  }
}

function copyDocument(document) {
  return structuredClone(document);
}

export function createSavedSceneRepository({
  database = getTherapyStudioDatabase(),
  createId = () => nanoid(),
  now = () => new Date().toISOString(),
} = {}) {
  const scenes = () => database.table("sceneDocuments");

  return {
    async listScenes(kind = "scene") {
      await ensureOpen(database);
      const records = (await scenes().orderBy("updatedAt").reverse().toArray()).filter(
        (record) => (record.kind ?? "scene") === kind
      );
      return records.map((record) => savedSceneDocumentSchema.parse(record));
    },

    async getScene(id) {
      await ensureOpen(database);
      const record = await scenes().get(id);
      if (!record) throw new Error(`Saved scene not found: ${id}`);
      return savedSceneDocumentSchema.parse(record);
    },

    async saveScene({ id, kind = "scene", title, workspaceDocument }) {
      await ensureOpen(database);
      const existing = id ? await scenes().get(id) : null;
      const timestamp = now();
      const record = savedSceneDocumentSchema.parse({
        id: existing?.id ?? id ?? createId(),
        documentVersion: 1,
        kind,
        title: title.trim(),
        workspaceDocument: copyDocument(workspaceDocument),
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
      });
      await scenes().put(record);
      return copyDocument(record);
    },
  };
}

export const savedSceneRepository = createSavedSceneRepository();
