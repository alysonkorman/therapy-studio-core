import { z } from "zod";

export const THERAPY_STUDIO_BACKUP_FORMAT = "therapy-studio-backup";
export const THERAPY_STUDIO_BACKUP_VERSION = 1;

export const therapyStudioBackupDataSchema = z
  .object({
    resources: z.array(z.unknown()),
    categories: z.array(z.unknown()),
    playlists: z.array(z.unknown()),
    resourceMemory: z.array(z.unknown()),
    sessionProfiles: z.array(z.unknown()),
    worksheetDocuments: z.array(z.unknown()),
    interventionGuidance: z.array(z.unknown()).default([]),
  })
  .strict();

export const therapyStudioBackupEnvelopeSchema = z
  .object({
    format: z.literal(THERAPY_STUDIO_BACKUP_FORMAT),
    version: z.literal(THERAPY_STUDIO_BACKUP_VERSION),
    exportedAt: z.string().datetime({ offset: true }),
    databaseVersion: z.number().int().positive().optional(),
    data: therapyStudioBackupDataSchema,
  })
  .strict();
