import Dexie from "dexie";

export const THERAPY_STUDIO_DATABASE_NAME = "therapy-studio";
export const THERAPY_STUDIO_DATABASE_VERSION = 1;
export const THERAPY_STUDIO_VERSION_1_SCHEMA = Object.freeze({
  resources: "id",
});
export const THERAPY_STUDIO_DATABASE_LATEST_VERSION = 10;
export const THERAPY_STUDIO_VERSION_2_SCHEMA = Object.freeze({
  resources: "id",
  categories: "id",
  playlists: "id",
});
export const THERAPY_STUDIO_VERSION_3_SCHEMA = Object.freeze({
  resources: "id",
  categories: "id",
  playlists: "id",
  resourceMemory: "resourceId, favorite, rating, lastUsedAt, useCount",
});
export const THERAPY_STUDIO_VERSION_4_SCHEMA = Object.freeze({
  ...THERAPY_STUDIO_VERSION_3_SCHEMA,
  sessionProfiles: "id, archived, updatedAt, lastOpenedAt",
});
export const THERAPY_STUDIO_VERSION_5_SCHEMA = Object.freeze({
  ...THERAPY_STUDIO_VERSION_4_SCHEMA,
  worksheetDocuments: "worksheetId",
});
export const THERAPY_STUDIO_VERSION_6_SCHEMA = Object.freeze({
  ...THERAPY_STUDIO_VERSION_5_SCHEMA,
  sceneDocuments: "id, updatedAt",
});
export const THERAPY_STUDIO_VERSION_7_SCHEMA = Object.freeze({
  ...THERAPY_STUDIO_VERSION_6_SCHEMA,
  interventionGuidance: "resourceId",
});
export const THERAPY_STUDIO_VERSION_8_SCHEMA = Object.freeze({
  ...THERAPY_STUDIO_VERSION_7_SCHEMA,
  whiteboardDocuments: "id, updatedAt",
});
export const THERAPY_STUDIO_VERSION_9_SCHEMA = Object.freeze({
  ...THERAPY_STUDIO_VERSION_8_SCHEMA,
  localMediaAssets: "id, createdAt",
});
export const THERAPY_STUDIO_VERSION_10_SCHEMA = Object.freeze({
  ...THERAPY_STUDIO_VERSION_9_SCHEMA,
  accountDataCache:
    "entityKey, accountId, entityType, [accountId+entityType], cloudRevision, updatedAt, deletedAt",
  accountDataSyncQueue: "id, entityKey, accountId, status, createdAt",
});
export const THERAPY_STUDIO_VERSION_11_SCHEMA = Object.freeze({
  ...THERAPY_STUDIO_VERSION_10_SCHEMA,
  iSpyBoards: "id, archived, updatedAt, createdAt",
});

export function createTherapyStudioDatabase({
  name = THERAPY_STUDIO_DATABASE_NAME,
  indexedDB,
  IDBKeyRange,
} = {}) {
  const hasInjectedDependencies = indexedDB !== undefined || IDBKeyRange !== undefined;
  const database = hasInjectedDependencies
    ? new Dexie(name, { indexedDB, IDBKeyRange })
    : new Dexie(name);

  database
    .version(THERAPY_STUDIO_DATABASE_VERSION)
    .stores(THERAPY_STUDIO_VERSION_1_SCHEMA);
  database.version(2).stores(THERAPY_STUDIO_VERSION_2_SCHEMA);
  database.version(3).stores(THERAPY_STUDIO_VERSION_3_SCHEMA);
  database.version(4).stores(THERAPY_STUDIO_VERSION_4_SCHEMA);
  database.version(5).stores(THERAPY_STUDIO_VERSION_5_SCHEMA);
  database.version(6).stores(THERAPY_STUDIO_VERSION_6_SCHEMA);
  database.version(7).stores(THERAPY_STUDIO_VERSION_7_SCHEMA);
  database.version(8).stores(THERAPY_STUDIO_VERSION_8_SCHEMA);
  database.version(9).stores(THERAPY_STUDIO_VERSION_9_SCHEMA);
  database.version(10).stores(THERAPY_STUDIO_VERSION_10_SCHEMA);
  database.version(11).stores(THERAPY_STUDIO_VERSION_11_SCHEMA);

  return database;
}

let applicationDatabase;

export function getTherapyStudioDatabase() {
  applicationDatabase ??= createTherapyStudioDatabase();
  return applicationDatabase;
}
