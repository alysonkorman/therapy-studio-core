import Dexie from "dexie";

export const THERAPY_STUDIO_DATABASE_NAME = "therapy-studio";
export const THERAPY_STUDIO_DATABASE_VERSION = 1;
export const THERAPY_STUDIO_VERSION_1_SCHEMA = Object.freeze({
  resources: "id",
});
export const THERAPY_STUDIO_DATABASE_LATEST_VERSION = 5;
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

  return database;
}

let applicationDatabase;

export function getTherapyStudioDatabase() {
  applicationDatabase ??= createTherapyStudioDatabase();
  return applicationDatabase;
}
