import Dexie from "dexie";
import { nanoid } from "nanoid";

import { createSessionProfile, sessionProfileSchema } from "../../models/sessionProfile";
import { getTherapyStudioDatabase } from "./database";

export const sessionProfileErrorCodes = Object.freeze({
  invalidProfile: "invalid-profile",
  duplicateProfile: "duplicate-profile",
  profileNotFound: "profile-not-found",
  invalidUpdate: "invalid-update",
  malformedStoredProfile: "malformed-stored-profile",
  databaseUnavailable: "database-unavailable",
  databaseOpenFailed: "database-open-failed",
  transactionFailed: "transaction-failed",
  writeFailed: "write-failed",
});

export class SessionProfileRepositoryError extends Error {
  constructor(code, message, { cause, details } = {}) {
    super(message, { cause });
    this.name = "SessionProfileRepositoryError";
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

const repositoryError = (code, message, options) =>
  new SessionProfileRepositoryError(code, message, options);

function parseProfile(input, code = sessionProfileErrorCodes.invalidProfile) {
  const result = sessionProfileSchema.safeParse(input);
  if (!result.success) {
    throw repositoryError(code, "Session Profile failed validation.", {
      cause: result.error,
      details: result.error.issues,
    });
  }
  return result.data;
}

async function ensureOpen(database) {
  if (database.isOpen()) return;
  try {
    await database.open();
  } catch (error) {
    if (error instanceof Dexie.MissingAPIError || error?.name === "MissingAPIError") {
      throw repositoryError(
        sessionProfileErrorCodes.databaseUnavailable,
        "Session Profiles are unavailable in this environment.",
        { cause: error }
      );
    }
    throw repositoryError(
      sessionProfileErrorCodes.databaseOpenFailed,
      "Therapy Studio could not open Session Profiles.",
      { cause: error }
    );
  }
}

function rethrow(error, code, message) {
  if (error instanceof SessionProfileRepositoryError) throw error;
  throw repositoryError(code, message, { cause: error });
}

const compareProfiles = (left, right) =>
  String(right.lastOpenedAt ?? "").localeCompare(String(left.lastOpenedAt ?? "")) ||
  right.updatedAt.localeCompare(left.updatedAt) ||
  left.id.localeCompare(right.id);

export function createSessionProfileRepository({
  database = getTherapyStudioDatabase(),
  now = () => new Date().toISOString(),
  createId = () => nanoid(),
} = {}) {
  const table = () => database.table("sessionProfiles");

  async function getAllSessionProfiles({ includeArchived = false } = {}) {
    await ensureOpen(database);
    try {
      return (await table().toArray())
        .map((record) =>
          parseProfile(record, sessionProfileErrorCodes.malformedStoredProfile)
        )
        .filter((profile) => includeArchived || !profile.archived)
        .sort(compareProfiles);
    } catch (error) {
      rethrow(
        error,
        sessionProfileErrorCodes.transactionFailed,
        "Session Profiles could not be read."
      );
    }
  }

  async function getSessionProfileById(id) {
    await ensureOpen(database);
    try {
      const record = await table().get(id);
      if (!record)
        throw repositoryError(
          sessionProfileErrorCodes.profileNotFound,
          `Session Profile not found: ${id}`
        );
      return parseProfile(record, sessionProfileErrorCodes.malformedStoredProfile);
    } catch (error) {
      rethrow(
        error,
        sessionProfileErrorCodes.transactionFailed,
        `Session Profile could not be read: ${id}`
      );
    }
  }

  async function createSessionProfileRecord(input) {
    const timestamp = now();
    const profile = createSessionProfile(input, {
      id: input.id ?? createId(),
      now: timestamp,
    });
    await ensureOpen(database);
    try {
      await table().add(profile);
      return profile;
    } catch (error) {
      if (error instanceof Dexie.ConstraintError || error?.name === "ConstraintError") {
        throw repositoryError(
          sessionProfileErrorCodes.duplicateProfile,
          `Session Profile already exists: ${profile.id}`,
          { cause: error }
        );
      }
      rethrow(
        error,
        sessionProfileErrorCodes.writeFailed,
        "Session Profile could not be created."
      );
    }
  }

  async function updateSessionProfile(id, changes) {
    if (
      !changes ||
      typeof changes !== "object" ||
      Array.isArray(changes) ||
      ["id", "createdAt", "updatedAt", "lastOpenedAt", "archived"].some(
        (field) => field in changes
      )
    ) {
      throw repositoryError(
        sessionProfileErrorCodes.invalidUpdate,
        "Session Profile update is invalid."
      );
    }
    await ensureOpen(database);
    try {
      return await database.transaction("rw", table(), async () => {
        const current = await getSessionProfileById(id);
        const updated = parseProfile(
          { ...current, ...changes, id, createdAt: current.createdAt, updatedAt: now() },
          sessionProfileErrorCodes.invalidUpdate
        );
        await table().put(updated);
        return updated;
      });
    } catch (error) {
      rethrow(
        error,
        sessionProfileErrorCodes.writeFailed,
        "Session Profile could not be updated."
      );
    }
  }

  async function setArchived(id, archived) {
    await ensureOpen(database);
    try {
      const current = await getSessionProfileById(id);
      const updated = parseProfile({ ...current, archived, updatedAt: now() });
      await table().put(updated);
      return updated;
    } catch (error) {
      rethrow(
        error,
        sessionProfileErrorCodes.writeFailed,
        "Session Profile archive state could not be updated."
      );
    }
  }

  async function duplicateSessionProfile(id) {
    const current = await getSessionProfileById(id);
    const {
      id: ignoredId,
      createdAt,
      updatedAt,
      lastOpenedAt,
      archived,
      ...copy
    } = current;
    void ignoredId;
    void createdAt;
    void updatedAt;
    void lastOpenedAt;
    void archived;
    return createSessionProfileRecord({
      ...copy,
      displayName: `${current.displayName} Copy`,
    });
  }

  async function deleteSessionProfilePermanently(id) {
    await getSessionProfileById(id);
    try {
      await table().delete(id);
    } catch (error) {
      rethrow(
        error,
        sessionProfileErrorCodes.writeFailed,
        "Session Profile could not be deleted."
      );
    }
  }

  async function markSessionProfileOpened(id, openedAt = now()) {
    const current = await getSessionProfileById(id);
    const updated = parseProfile({
      ...current,
      lastOpenedAt: openedAt,
      updatedAt: now(),
    });
    await table().put(updated);
    return updated;
  }

  async function searchSessionProfiles(query, options) {
    const normalized = String(query).trim().toLocaleLowerCase();
    const profiles = await getAllSessionProfiles(options);
    if (!normalized) return profiles;
    return profiles.filter((profile) =>
      [
        profile.displayName,
        ...profile.interests,
        ...profile.goals,
        ...profile.diagnoses,
        ...profile.presentingConcerns,
        ...profile.customTags,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalized)
    );
  }

  async function clearSessionProfilesForTests() {
    if (!database.name.startsWith("therapy-studio-test-"))
      throw repositoryError(
        sessionProfileErrorCodes.transactionFailed,
        "Refusing to clear a non-test Session Profile database."
      );
    await ensureOpen(database);
    await table().clear();
  }

  return {
    getAllSessionProfiles,
    getSessionProfileById,
    createSessionProfile: createSessionProfileRecord,
    updateSessionProfile,
    duplicateSessionProfile,
    archiveSessionProfile: (id) => setArchived(id, true),
    restoreSessionProfile: (id) => setArchived(id, false),
    deleteSessionProfilePermanently,
    markSessionProfileOpened,
    searchSessionProfiles,
    clearSessionProfilesForTests,
  };
}

export const sessionProfileRepository = createSessionProfileRepository();
