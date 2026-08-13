import { z } from "zod";

export const LOCAL_MEDIA_MAX_BYTES = 15 * 1024 * 1024;
export const localMediaMimeTypes = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const localMediaAssetMetadataSchema = z
  .object({
    id: z.string().min(1),
    mimeType: z.enum(localMediaMimeTypes),
    width: z.number().int().positive().max(20000),
    height: z.number().int().positive().max(20000),
    size: z.number().int().positive().max(LOCAL_MEDIA_MAX_BYTES),
    accessibilityLabel: z.string().trim().max(160).default("Imported activity"),
    createdAt: z.string().datetime(),
  })
  .strict();

export const localMediaBackupAssetSchema = localMediaAssetMetadataSchema
  .extend({ dataBase64: z.string().min(1) })
  .strict();
