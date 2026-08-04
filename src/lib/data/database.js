import Dexie from "dexie";

export const THERAPY_STUDIO_DATABASE_NAME = "therapy-studio";
export const THERAPY_STUDIO_DATABASE_VERSION = 1;
export const THERAPY_STUDIO_VERSION_1_SCHEMA = Object.freeze({
  resources: "id",
});
export const THERAPY_STUDIO_DATABASE_LATEST_VERSION = 3;
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
  database
    .version(THERAPY_STUDIO_DATABASE_LATEST_VERSION)
    .stores(THERAPY_STUDIO_VERSION_2_SCHEMA);
  database
    .version(THERAPY_STUDIO_DATABASE_LATEST_VERSION)
    .stores(THERAPY_STUDIO_VERSION_3_SCHEMA);

  return database;
}

let applicationDatabase;

export function getTherapyStudioDatabase() {
  applicationDatabase ??= createTherapyStudioDatabase();
  return applicationDatabase;
}
