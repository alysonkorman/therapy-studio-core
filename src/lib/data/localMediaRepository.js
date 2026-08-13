import Dexie from "dexie";
import { nanoid } from "nanoid";

import {
  LOCAL_MEDIA_MAX_BYTES,
  localMediaAssetMetadataSchema,
} from "../../models/localMediaAsset";
import { getTherapyStudioDatabase } from "./database";

async function ensureOpen(database) {
  if (database.isOpen()) return;
  try {
    await database.open();
  } catch (error) {
    if (error instanceof Dexie.MissingAPIError || error?.name === "MissingAPIError") {
      throw new Error("Local activity media is unavailable in this browser.", {
        cause: error,
      });
    }
    throw error;
  }
}

export function createLocalMediaRepository({
  database = getTherapyStudioDatabase(),
  createId = () => nanoid(),
  now = () => new Date().toISOString(),
} = {}) {
  const table = () => database.table("localMediaAssets");
  return {
    async saveAsset({ blob, width, height, accessibilityLabel = "Imported activity" }) {
      await ensureOpen(database);
      if (!(blob instanceof Blob) || !blob.size || blob.size > LOCAL_MEDIA_MAX_BYTES) {
        throw new Error("Choose an activity file smaller than 15 MB.");
      }
      const metadata = localMediaAssetMetadataSchema.parse({
        id: createId(),
        mimeType: blob.type,
        width,
        height,
        size: blob.size,
        accessibilityLabel,
        createdAt: now(),
      });
      await table().add({ ...metadata, data: await blob.arrayBuffer() });
      return structuredClone(metadata);
    },
    async getAsset(id) {
      await ensureOpen(database);
      const asset = await table().get(id);
      return asset
        ? {
            ...asset,
            blob: new Blob([asset.data], { type: asset.mimeType }),
          }
        : null;
    },
    async deleteAsset(id) {
      await ensureOpen(database);
      await table().delete(id);
    },
  };
}

export const localMediaRepository = createLocalMediaRepository();
