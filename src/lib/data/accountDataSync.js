import { nanoid } from "nanoid";

import {
  accountDataContentId,
  accountDataEntityTypeSchema,
  projectAccountDataContent,
} from "../../models/accountData";
import { AccountDataApiError, accountDataClient } from "./accountDataClient";
import { getTherapyStudioDatabase } from "./database";
import { getCognitoHostToken } from "../../features/live-sessions/liveSessionHostAuth";
import { hasConfiguredAccountData } from "./accountDataClient";

export const accountDataSyncStates = Object.freeze({
  localOnly: "local-only",
  saving: "saving",
  saved: "saved",
  offlineSavedLocally: "offline-saved-locally",
  conflict: "conflict",
  error: "error",
});

const entityKey = (accountId, entityType, id) => `${accountId}:${entityType}:${id}`;
const onlineByDefault = () =>
  typeof navigator === "undefined" || navigator.onLine !== false;

function isConflict(error) {
  return error instanceof AccountDataApiError && error.code === "revision-conflict";
}

function isOffline(error) {
  return (
    error instanceof AccountDataApiError &&
    (error.code === "network" || error.code === "unconfigured" || error.status === 0)
  );
}

function ensureContent(entityType, id, content) {
  const safeType = accountDataEntityTypeSchema.parse(entityType);
  const projected = projectAccountDataContent(safeType, content);
  if (accountDataContentId(safeType, projected) !== id) {
    throw new Error("Account Data content ID does not match its queue identity.");
  }
  return { content: projected, entityType: safeType };
}

export function cognitoAccountIdFromToken(token) {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/gu, "+").replace(/_/gu, "/");
    const decoded = JSON.parse(atob(normalized));
    return typeof decoded.sub === "string" && decoded.sub ? decoded.sub : null;
  } catch {
    return null;
  }
}

export function createAccountDataSyncService({
  api = accountDataClient,
  createId = () => nanoid(),
  database = getTherapyStudioDatabase(),
  getAccountId = () => "test-account",
  getToken = () => null,
  isConfigured = () => true,
  isOnline = onlineByDefault,
  now = () => new Date().toISOString(),
} = {}) {
  const cache = () => database.table("accountDataCache");
  const queue = () => database.table("accountDataSyncQueue");
  const accountId = () => getAccountId(getToken());

  async function ensureOpen() {
    if (!database.isOpen()) await database.open();
  }

  async function putCache(record, { status = accountDataSyncStates.saved } = {}) {
    await cache().put({
      ...record,
      accountId: record.accountId,
      entityKey: entityKey(record.accountId, record.entityType, record.id),
      status,
    });
  }

  async function enqueue({ content, entityType, id, operation }) {
    await ensureOpen();
    const parsed =
      operation === "delete"
        ? { entityType: accountDataEntityTypeSchema.parse(entityType) }
        : ensureContent(entityType, id, content);
    const owner = accountId();
    if (!owner) throw new AccountDataApiError("unauthenticated", 401);
    const key = entityKey(owner, parsed.entityType, id);
    const current = await cache().get(key);
    const existing = await queue().where("entityKey").equals(key).first();
    if (
      operation === "delete" &&
      existing?.operation === "create" &&
      existing.baseRevision === null
    ) {
      await database.transaction("rw", [cache(), queue()], async () => {
        await cache().delete(key);
        await queue().delete(existing.id);
      });
      return { deletedAt: now(), entityKey: key, entityType: parsed.entityType, id };
    }
    const baseRevision = current?.cloudRevision ?? null;
    const timestamp = now();
    const localRecord = {
      ...(current ?? {}),
      accountId: owner,
      cloudRevision: current?.cloudRevision ?? null,
      content: operation === "delete" ? (current?.content ?? null) : parsed.content,
      deletedAt: operation === "delete" ? timestamp : null,
      entityKey: key,
      entityType: parsed.entityType,
      id,
      status: getToken() ? accountDataSyncStates.saving : accountDataSyncStates.localOnly,
      updatedAt: timestamp,
    };

    await database.transaction("rw", [cache(), queue()], async () => {
      await putCache(localRecord, { status: localRecord.status });
      const entry = {
        accountId: owner,
        baseRevision: existing?.baseRevision ?? baseRevision,
        content: localRecord.content,
        createdAt: existing?.createdAt ?? timestamp,
        entityKey: key,
        entityId: id,
        entityType: parsed.entityType,
        id,
        idempotencyId: existing?.idempotencyId ?? createId(),
        lastError: null,
        operation:
          operation === "delete"
            ? "delete"
            : existing?.operation === "create" || baseRevision === null
              ? "create"
              : "update",
        retryCount: existing?.retryCount ?? 0,
        status: "pending",
        updatedAt: timestamp,
      };
      if (existing) await queue().update(existing.id, entry);
      else await queue().add({ ...entry, id: createId() });
    });

    return localRecord;
  }

  async function applyRemote(record) {
    const owner = accountId();
    if (!owner) return;
    const key = entityKey(owner, record.entityType, record.id);
    const pending = await queue().where("entityKey").equals(key).first();
    const current = await cache().get(key);
    if ((current?.cloudRevision ?? 0) > record.revision) return;
    if (pending) {
      await cache().update(key, {
        cloudSnapshot: record,
        remoteRevision: record.revision,
        updatedAt: now(),
      });
      return;
    }
    await putCache(
      {
        ...record,
        accountId: owner,
        cloudRevision: record.revision,
        entityKey: key,
        status: record.deletedAt
          ? accountDataSyncStates.saved
          : accountDataSyncStates.saved,
      },
      { status: accountDataSyncStates.saved }
    );
  }

  async function reconcile() {
    await ensureOpen();
    const token = getToken();
    if (!token) return { status: accountDataSyncStates.localOnly, synced: 0 };
    if (!isOnline())
      return { status: accountDataSyncStates.offlineSavedLocally, synced: 0 };

    let remote;
    try {
      remote = await api.list({ token });
    } catch (error) {
      return {
        status: isOffline(error)
          ? accountDataSyncStates.offlineSavedLocally
          : accountDataSyncStates.error,
        synced: 0,
      };
    }
    for (const record of remote.records ?? []) await applyRemote(record);
    return processQueue({ token });
  }

  async function handleFailure(entry, error, token) {
    const local = await cache().get(entry.entityKey);
    if (isConflict(error)) {
      let cloudSnapshot = local?.cloudSnapshot ?? null;
      try {
        cloudSnapshot = await api.fetch({
          entityType: entry.entityType,
          id: entry.entityId,
          token,
        });
      } catch {
        // The retained local draft remains recoverable even if the review snapshot is unavailable.
      }
      await database.transaction("rw", [cache(), queue()], async () => {
        await queue().update(entry.id, {
          lastError: "revision-conflict",
          status: accountDataSyncStates.conflict,
          updatedAt: now(),
        });
        await cache().update(entry.entityKey, {
          cloudSnapshot,
          remoteRevision: cloudSnapshot?.revision ?? local?.remoteRevision ?? null,
          status: accountDataSyncStates.conflict,
          updatedAt: now(),
        });
      });
      return accountDataSyncStates.conflict;
    }

    const status = isOffline(error)
      ? accountDataSyncStates.offlineSavedLocally
      : accountDataSyncStates.error;
    await database.transaction("rw", [cache(), queue()], async () => {
      await queue().update(entry.id, {
        lastError: error instanceof Error ? (error.code ?? "unavailable") : "unavailable",
        retryCount: entry.retryCount + 1,
        status: "pending",
        updatedAt: now(),
      });
      await cache().update(entry.entityKey, { status, updatedAt: now() });
    });
    return status;
  }

  async function processQueue({ token = getToken() } = {}) {
    await ensureOpen();
    if (!token) return { status: accountDataSyncStates.localOnly, synced: 0 };
    if (!isOnline())
      return { status: accountDataSyncStates.offlineSavedLocally, synced: 0 };

    const owner = accountId();
    if (!owner) return { status: accountDataSyncStates.localOnly, synced: 0 };
    const queued = (await queue().orderBy("createdAt").toArray()).filter(
      (entry) => entry.accountId === owner
    );
    if (queued.some((entry) => entry.status === accountDataSyncStates.conflict)) {
      return { status: accountDataSyncStates.conflict, synced: 0 };
    }
    const entries = queued;
    let synced = 0;
    let status = accountDataSyncStates.saved;
    for (const entry of entries) {
      try {
        const result =
          entry.operation === "create"
            ? await api.create({
                content: entry.content,
                entityType: entry.entityType,
                id: entry.entityId,
                idempotencyId: entry.idempotencyId,
                token,
              })
            : entry.operation === "update"
              ? await api.update({
                  content: entry.content,
                  entityType: entry.entityType,
                  expectedRevision: entry.baseRevision,
                  id: entry.entityId,
                  idempotencyId: entry.idempotencyId,
                  token,
                })
              : await api.tombstone({
                  entityType: entry.entityType,
                  expectedRevision: entry.baseRevision,
                  id: entry.entityId,
                  idempotencyId: entry.idempotencyId,
                  token,
                });
        await database.transaction("rw", [cache(), queue()], async () => {
          await putCache(
            { ...result, accountId: entry.accountId, cloudRevision: result.revision },
            { status: accountDataSyncStates.saved }
          );
          await queue().delete(entry.id);
        });
        synced += 1;
      } catch (error) {
        status = await handleFailure(entry, error, token);
        if (status === accountDataSyncStates.conflict) break;
        if (status === accountDataSyncStates.offlineSavedLocally) break;
      }
    }
    return { status, synced };
  }

  return {
    enqueueCreate: ({ content, entityType, id }) =>
      enqueue({ content, entityType, id, operation: "create" }),
    enqueueTombstone: ({ entityType, id }) =>
      enqueue({ entityType, id, operation: "delete" }),
    enqueueUpdate: ({ content, entityType, id }) =>
      enqueue({ content, entityType, id, operation: "update" }),
    getCached: async (entityType, id) => {
      await ensureOpen();
      const owner = accountId();
      return owner ? cache().get(entityKey(owner, entityType, id)) : undefined;
    },
    getCachedByType: async (entityType) => {
      await ensureOpen();
      const owner = accountId();
      if (!owner) return [];
      return cache()
        .where("entityType")
        .equals(accountDataEntityTypeSchema.parse(entityType))
        .filter((record) => record.accountId === owner)
        .toArray();
    },
    getQueue: async () => {
      await ensureOpen();
      const owner = accountId();
      return owner ? queue().where("accountId").equals(owner).sortBy("createdAt") : [];
    },
    processQueue,
    reconcile,
    isAvailable: () => Boolean(getToken()) && Boolean(accountId()) && isConfigured(),
  };
}

export const accountDataSyncService = createAccountDataSyncService({
  getAccountId: cognitoAccountIdFromToken,
  getToken: getCognitoHostToken,
  isConfigured: hasConfiguredAccountData,
});
