import "fake-indexeddb/auto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { AccountDataApiError } from "./accountDataClient";
import {
  accountDataSyncStates,
  cognitoAccountIdFromToken,
  createAccountDataSyncService,
} from "./accountDataSync";
import { createTherapyStudioDatabase } from "./database";

const databases = [];
const timestamp = "2026-08-16T12:00:00.000Z";

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()));
});

function database() {
  const value = createTherapyStudioDatabase({
    name: `account-data-sync-${crypto.randomUUID()}`,
  });
  databases.push(value);
  return value;
}

function promptDeck(title = "Cloud-safe deck") {
  return {
    id: "deck-1",
    type: "prompt-deck",
    title,
    createdAt: timestamp,
    updatedAt: timestamp,
    category: "CBT",
    color: "#6C46C3",
    iconId: "icon-1",
    prompts: [{ id: "prompt-1", text: "What helps?" }],
  };
}

function fakeApi() {
  const records = new Map();
  const key = ({ entityType, id }) => `${entityType}:${id}`;
  const put = (record) => records.set(key(record), structuredClone(record));
  return {
    records,
    async list() {
      return { records: [...records.values()] };
    },
    async fetch({ entityType, id }) {
      const record = records.get(key({ entityType, id }));
      if (!record) throw new AccountDataApiError("account-record-not-found", 404);
      return structuredClone(record);
    },
    async create({ content, entityType, id }) {
      if (records.has(key({ entityType, id })))
        throw new AccountDataApiError("revision-conflict", 409);
      const record = {
        content,
        createdAt: timestamp,
        deletedAt: null,
        entityType,
        id,
        revision: 1,
        schemaVersion: 1,
        updatedAt: timestamp,
      };
      put(record);
      return structuredClone(record);
    },
    async update({ content, entityType, expectedRevision, id }) {
      const current = records.get(key({ entityType, id }));
      if (!current || current.revision !== expectedRevision)
        throw new AccountDataApiError("revision-conflict", 409);
      const record = {
        ...current,
        content,
        revision: current.revision + 1,
        updatedAt: timestamp,
      };
      put(record);
      return structuredClone(record);
    },
    async tombstone({ entityType, expectedRevision, id }) {
      const current = records.get(key({ entityType, id }));
      if (!current || current.revision !== expectedRevision)
        throw new AccountDataApiError("revision-conflict", 409);
      const record = {
        ...current,
        deletedAt: timestamp,
        revision: current.revision + 1,
        updatedAt: timestamp,
      };
      put(record);
      return structuredClone(record);
    },
  };
}

function service(overrides = {}) {
  return createAccountDataSyncService({
    api: fakeApi(),
    database: database(),
    getToken: () => "fake-id-token",
    ...overrides,
  });
}

describe("Account Data sync queue", () => {
  it("derives only the Cognito subject used to isolate browser caches", () => {
    const payload = btoa(
      JSON.stringify({ email: "not-cached@example.com", sub: "user-1" })
    )
      .replace(/\+/gu, "-")
      .replace(/\//gu, "_")
      .replace(/=+$/u, "");
    expect(cognitoAccountIdFromToken(`header.${payload}.signature`)).toBe("user-1");
    expect(cognitoAccountIdFromToken("invalid")).toBeNull();
  });

  it("creates, stores the cloud revision, and clears the durable queue", async () => {
    const sync = service();
    await sync.enqueueCreate({
      content: promptDeck(),
      entityType: "prompt-deck",
      id: "deck-1",
    });

    await expect(sync.processQueue()).resolves.toMatchObject({ synced: 1 });
    await expect(sync.getQueue()).resolves.toEqual([]);
    await expect(sync.getCached("prompt-deck", "deck-1")).resolves.toMatchObject({
      cloudRevision: 1,
      status: accountDataSyncStates.saved,
    });
  });

  it("uses the stored revision when updating", async () => {
    const sync = service();
    await sync.enqueueCreate({
      content: promptDeck(),
      entityType: "prompt-deck",
      id: "deck-1",
    });
    await sync.processQueue();
    await sync.enqueueUpdate({
      content: promptDeck("Updated"),
      entityType: "prompt-deck",
      id: "deck-1",
    });

    await sync.processQueue();
    await expect(sync.getCached("prompt-deck", "deck-1")).resolves.toMatchObject({
      cloudRevision: 2,
      content: { resource: { title: "Updated" } },
    });
  });

  it("retains local writes while offline and uploads them after reconnect", async () => {
    let online = false;
    const sync = service({ isOnline: () => online });
    await sync.enqueueCreate({
      content: promptDeck(),
      entityType: "prompt-deck",
      id: "deck-1",
    });

    await expect(sync.processQueue()).resolves.toMatchObject({
      status: accountDataSyncStates.offlineSavedLocally,
    });
    expect(await sync.getQueue()).toHaveLength(1);
    online = true;
    await expect(sync.processQueue()).resolves.toMatchObject({ synced: 1 });
  });

  it("keeps local data usable when the account list request is offline", async () => {
    const api = fakeApi();
    api.list = vi.fn(async () => {
      throw new AccountDataApiError("network", 0);
    });
    const sync = service({ api });

    await expect(sync.reconcile()).resolves.toEqual({
      status: accountDataSyncStates.offlineSavedLocally,
      synced: 0,
    });
  });

  it("collapses an unsynced create followed by deletion without calling cloud", async () => {
    const api = fakeApi();
    const create = vi.spyOn(api, "create");
    const tombstone = vi.spyOn(api, "tombstone");
    const sync = service({ api, isOnline: () => false });
    await sync.enqueueCreate({
      content: promptDeck(),
      entityType: "prompt-deck",
      id: "deck-1",
    });

    await sync.enqueueTombstone({ entityType: "prompt-deck", id: "deck-1" });

    expect(await sync.getQueue()).toEqual([]);
    expect(await sync.getCached("prompt-deck", "deck-1")).toBeUndefined();
    expect(create).not.toHaveBeenCalled();
    expect(tombstone).not.toHaveBeenCalled();
  });

  it("retains a local draft and records a conflict without retrying it", async () => {
    const api = fakeApi();
    const sync = service({ api });
    await sync.enqueueCreate({
      content: promptDeck(),
      entityType: "prompt-deck",
      id: "deck-1",
    });
    await sync.processQueue();
    api.records.get("prompt-deck:deck-1").revision = 2;
    await sync.enqueueUpdate({
      content: promptDeck("Local draft"),
      entityType: "prompt-deck",
      id: "deck-1",
    });

    await expect(sync.processQueue()).resolves.toMatchObject({
      status: accountDataSyncStates.conflict,
    });
    await expect(sync.getQueue()).resolves.toEqual([
      expect.objectContaining({ status: accountDataSyncStates.conflict }),
    ]);
    await expect(sync.getCached("prompt-deck", "deck-1")).resolves.toMatchObject({
      content: { resource: { title: "Local draft" } },
      status: accountDataSyncStates.conflict,
    });
  });

  it("adopts a remote change only when no local edit is pending", async () => {
    const api = fakeApi();
    await api.create({
      content: { archived: false, resource: promptDeck("Remote") },
      entityType: "prompt-deck",
      id: "deck-1",
    });
    const sync = service({ api });

    await sync.reconcile();
    await expect(sync.getCached("prompt-deck", "deck-1")).resolves.toMatchObject({
      cloudRevision: 1,
      content: { resource: { title: "Remote" } },
    });
  });

  it("does not overwrite a pending local draft with a remote change", async () => {
    const api = fakeApi();
    const sync = service({ api });
    await sync.enqueueCreate({
      content: promptDeck("Local"),
      entityType: "prompt-deck",
      id: "deck-1",
    });
    await api.create({
      content: { archived: false, resource: promptDeck("Remote") },
      entityType: "prompt-deck",
      id: "deck-1",
    });

    await sync.reconcile();
    await expect(sync.getCached("prompt-deck", "deck-1")).resolves.toMatchObject({
      content: { resource: { title: "Local" } },
      cloudSnapshot: { content: { resource: { title: "Remote" } } },
    });
  });

  it("preserves cloud tombstones so a deleted record cannot be resurrected", async () => {
    const api = fakeApi();
    await api.create({
      content: { archived: false, resource: promptDeck() },
      entityType: "prompt-deck",
      id: "deck-1",
    });
    await api.tombstone({ entityType: "prompt-deck", expectedRevision: 1, id: "deck-1" });
    const sync = service({ api });

    await sync.reconcile();
    await expect(sync.getCached("prompt-deck", "deck-1")).resolves.toMatchObject({
      cloudRevision: 2,
      deletedAt: timestamp,
    });
  });

  it("does not call the account API when authentication is absent", async () => {
    const api = fakeApi();
    const list = vi.spyOn(api, "list");
    const create = vi.spyOn(api, "create");
    const sync = service({ api, getToken: () => null });
    await sync.enqueueCreate({
      content: promptDeck(),
      entityType: "prompt-deck",
      id: "deck-1",
    });

    await expect(sync.reconcile()).resolves.toMatchObject({
      status: accountDataSyncStates.localOnly,
    });
    expect(list).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(await sync.getQueue()).toHaveLength(1);
  });

  it("isolates cached records and queued writes by Cognito account", async () => {
    const sharedDatabase = database();
    const browserFor = (accountId) =>
      createAccountDataSyncService({
        api: fakeApi(),
        database: sharedDatabase,
        getAccountId: () => accountId,
        getToken: () => "fake-id-token",
        isOnline: () => false,
      });
    const accountA = browserFor("account-a");
    const accountB = browserFor("account-b");
    await accountA.enqueueCreate({
      content: promptDeck(),
      entityType: "prompt-deck",
      id: "deck-1",
    });

    expect(await accountA.getQueue()).toHaveLength(1);
    expect(await accountB.getQueue()).toEqual([]);
    expect(await accountB.getCached("prompt-deck", "deck-1")).toBeUndefined();
  });
});
