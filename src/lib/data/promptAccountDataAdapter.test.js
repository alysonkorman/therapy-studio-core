import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import { AccountDataApiError } from "./accountDataClient";
import { createAccountDataSyncService, accountDataSyncStates } from "./accountDataSync";
import { createTherapyStudioDatabase } from "./database";
import {
  createPromptAccountDataAdapter,
  PROMPT_AUTHORING_ACKNOWLEDGMENT_VERSION,
} from "./promptAccountDataAdapter";
import { createCategoryRepository } from "./categoryRepository";
import { createPromptDeckRepository } from "./promptDeckRepository";

const databases = [];
const timestamp = "2026-08-17T12:00:00.000Z";

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()));
});

function createDatabase(label) {
  const database = createTherapyStudioDatabase({
    name: `prompt-account-${label}-${crypto.randomUUID()}`,
  });
  databases.push(database);
  return database;
}

function sharedFakeApi() {
  const records = new Map();
  const key = ({ entityType, id }) => `${entityType}:${id}`;
  const copy = (value) => structuredClone(value);
  return {
    records,
    async list() {
      return { records: [...records.values()].map(copy) };
    },
    async fetch(identity) {
      const record = records.get(key(identity));
      if (!record || record.deletedAt) {
        throw new AccountDataApiError("account-record-not-found", 404);
      }
      return copy(record);
    },
    async create({ content, entityType, id }) {
      const recordKey = key({ entityType, id });
      if (records.has(recordKey)) {
        throw new AccountDataApiError("revision-conflict", 409);
      }
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
      records.set(recordKey, copy(record));
      return copy(record);
    },
    async update({ content, entityType, expectedRevision, id }) {
      const recordKey = key({ entityType, id });
      const current = records.get(recordKey);
      if (!current || current.deletedAt || current.revision !== expectedRevision) {
        throw new AccountDataApiError("revision-conflict", 409);
      }
      const record = {
        ...current,
        content,
        revision: current.revision + 1,
        updatedAt: timestamp,
      };
      records.set(recordKey, copy(record));
      return copy(record);
    },
    async tombstone({ entityType, expectedRevision, id }) {
      const recordKey = key({ entityType, id });
      const current = records.get(recordKey);
      if (!current || current.deletedAt || current.revision !== expectedRevision) {
        throw new AccountDataApiError("revision-conflict", 409);
      }
      const record = {
        ...current,
        deletedAt: timestamp,
        revision: current.revision + 1,
        updatedAt: timestamp,
      };
      records.set(recordKey, copy(record));
      return copy(record);
    },
  };
}

function browser(label, api, { now = () => timestamp } = {}) {
  const database = createDatabase(label);
  const sync = createAccountDataSyncService({
    api,
    database,
    getToken: () => "same-cognito-account",
    now,
  });
  const accountData = createPromptAccountDataAdapter({ database, sync });
  let id = 0;
  const categories = createCategoryRepository({
    accountData,
    createId: () => `${label}-category-${++id}`,
    database,
    now,
  });
  const decks = createPromptDeckRepository({
    accountData,
    createId: () => `${label}-${++id}`,
    database,
    now,
  });
  return { accountData, categories, database, decks, sync };
}

describe("Prompt Account Data proof", () => {
  it("moves an account-owned Prompt customization between browser databases", async () => {
    const api = sharedFakeApi();
    const browserA = browser("browser-a", api);
    const browserB = browser("browser-b", api);

    let deck = await browserA.decks.createPromptDeck({ title: "Browser A" });
    deck = await browserA.decks.updatePromptDeck(deck.id, {
      color: "#3267A8",
      iconId: "ideas",
      title: "Shared current title",
    });
    deck = await browserA.decks.addPrompt(deck.id, { text: "What helps today?" });
    await browserA.decks.updatePrompt(deck.id, deck.prompts[0].id, {
      text: "What feels helpful right now?",
    });

    await browserB.decks.reconcileAccountData();
    await expect(browserB.decks.getPromptDeckById(deck.id)).resolves.toMatchObject({
      color: "#3267A8",
      iconId: "ideas",
      title: "Shared current title",
      prompts: [{ text: "What feels helpful right now?" }],
    });
  });

  it("syncs archive and deletion without touching unrelated local decks", async () => {
    const api = sharedFakeApi();
    const browserA = browser("browser-a", api);
    const browserB = browser("browser-b", api);
    const unrelated = await browserB.database.table("resources").put({
      archived: false,
      category: "",
      categoryId: null,
      color: "#6C46C3",
      createdAt: timestamp,
      description: "",
      iconId: "prompt-default",
      id: "local-only",
      prompts: [],
      sortOrder: 0,
      title: "Existing local content",
      type: "prompt-deck",
      updatedAt: timestamp,
    });
    expect(unrelated).toBe("local-only");

    const deck = await browserA.decks.createPromptDeck({ title: "Account deck" });
    await browserB.decks.reconcileAccountData();
    await browserA.decks.archivePromptDeck(deck.id);
    await browserB.decks.reconcileAccountData();
    await expect(browserB.decks.getPromptDeckById(deck.id)).resolves.toMatchObject({
      archived: true,
    });

    await browserA.decks.deletePromptDeck(deck.id);
    await browserB.decks.reconcileAccountData();
    await expect(browserB.decks.getPromptDeckById(deck.id)).rejects.toMatchObject({
      code: "resource-not-found",
    });
    await expect(browserB.decks.getPromptDeckById("local-only")).resolves.toMatchObject({
      title: "Existing local content",
    });
    expect(api.records.get(`prompt-deck:${deck.id}`).deletedAt).toBe(timestamp);
  });

  it("shares the Prompt authoring acknowledgment between browser databases", async () => {
    const api = sharedFakeApi();
    const browserA = browser("browser-a", api);
    const browserB = browser("browser-b", api);

    await browserA.accountData.saveAuthoringAcknowledgment();
    await browserB.accountData.reconcile();

    await expect(browserB.accountData.getAuthoringAcknowledgment()).resolves.toBe(
      PROMPT_AUTHORING_ACKNOWLEDGMENT_VERSION
    );
  });

  it("syncs new account-owned categories, their ordering, and deck category IDs", async () => {
    const api = sharedFakeApi();
    const browserA = browser("browser-a", api);
    const browserB = browser("browser-b", api);

    const connection = await browserA.categories.createCategory({
      name: "Connection",
      color: "#3267A8",
      iconId: "ideas",
    });
    const feelings = await browserA.categories.createCategory({
      name: "Feelings",
      color: "#2D7D73",
      iconId: "heart",
    });
    const deck = await browserA.decks.createPromptDeck({
      category: connection.name,
      categoryId: connection.id,
      title: "Connected deck",
    });

    await browserB.accountData.reconcile();
    await expect(
      browserB.categories.getCategoryById(connection.id)
    ).resolves.toMatchObject({
      color: "#3267A8",
      iconId: "ideas",
      name: "Connection",
    });
    await expect(browserB.decks.getPromptDeckById(deck.id)).resolves.toMatchObject({
      category: "Connection",
      categoryId: connection.id,
    });

    await browserA.categories.updateCategory(connection.id, {
      color: "#A14565",
      iconId: "sparkle",
      name: "Connection Skills",
    });
    await browserA.categories.reorderCategories([feelings.id, connection.id]);
    await browserB.accountData.reconcile();
    await expect(browserB.categories.getAllCategories()).resolves.toMatchObject([
      { id: feelings.id, sortOrder: 0 },
      {
        color: "#A14565",
        iconId: "sparkle",
        id: connection.id,
        name: "Connection Skills",
        sortOrder: 1,
      },
    ]);
  });

  it("syncs category archive, restore, and account-owned deletion without touching local categories", async () => {
    const api = sharedFakeApi();
    const browserA = browser("browser-a", api);
    const browserB = browser("browser-b", api);
    const category = await browserA.categories.createCategory({ name: "Disposable" });
    await browserB.accountData.reconcile();
    await browserB.database.table("categories").put({
      archived: false,
      color: "#6C46C3",
      createdAt: timestamp,
      iconId: "prompt-default",
      id: "local-category",
      name: "Local only",
      sortOrder: 1,
      updatedAt: timestamp,
    });

    await browserA.categories.archiveCategory(category.id);
    await browserB.accountData.reconcile();
    await expect(browserB.categories.getCategoryById(category.id)).resolves.toMatchObject(
      {
        archived: true,
      }
    );

    await browserA.categories.restoreCategory(category.id);
    await browserB.accountData.reconcile();
    await expect(browserB.categories.getCategoryById(category.id)).resolves.toMatchObject(
      {
        archived: false,
      }
    );

    await browserA.categories.deleteCategory(category.id);
    await browserB.accountData.reconcile();
    await expect(browserB.categories.getCategoryById(category.id)).rejects.toMatchObject({
      code: "authoring-record-not-found",
    });
    await expect(
      browserB.categories.getCategoryById("local-category")
    ).resolves.toMatchObject({
      name: "Local only",
    });
    expect(api.records.get(`category:${category.id}`).deletedAt).toBe(timestamp);
  });

  it("keeps historical cloud categories out of the post-reset taxonomy", async () => {
    const api = sharedFakeApi();
    const beforeReset = () => "2026-08-16T12:00:00.000Z";
    const afterReset = () => "2026-08-18T12:00:00.000Z";
    const browserA = browser("browser-a", api, { now: beforeReset });
    const browserB = browser("browser-b", api, { now: afterReset });
    const historical = await browserA.categories.createCategory({ name: "ACT" });

    await browserA.accountData.savePromptLibraryReset({
      phase: "complete",
      resetAt: "2026-08-17T12:00:00.000Z",
      retiredStarterIds: ["starter-one"],
    });
    await browserB.accountData.reconcile();

    await expect(browserB.categories.getAllCategories()).resolves.toEqual([]);
    const current = await browserB.categories.createCategory({ name: "ACT" });
    await browserA.accountData.reconcile();

    await expect(browserA.categories.getAllCategories()).resolves.toMatchObject([
      {
        id: current.id,
        name: "ACT",
        taxonomyGeneration: "2026-08-17T12:00:00.000Z",
      },
    ]);
    expect(current.id).not.toBe(historical.id);
    await expect(
      browserB.categories.createCategory({ name: " act " })
    ).rejects.toMatchObject({ code: "duplicate-authoring-record" });
  });

  it("only materializes current-generation categories in a second browser", async () => {
    const api = sharedFakeApi();
    const beforeReset = () => "2026-08-16T12:00:00.000Z";
    const afterReset = () => "2026-08-18T12:00:00.000Z";
    const browserA = browser("browser-a", api, { now: beforeReset });
    const browserB = browser("browser-b", api, { now: afterReset });
    await browserA.categories.createCategory({ name: "Historical" });
    await browserA.accountData.savePromptLibraryReset({
      phase: "complete",
      resetAt: "2026-08-17T12:00:00.000Z",
      retiredStarterIds: ["starter-one"],
    });
    await browserB.accountData.reconcile();
    const current = await browserB.categories.createCategory({ name: "Current" });

    await browserA.accountData.reconcile();
    await browserB.accountData.reconcile();

    await expect(browserA.categories.getAllCategories()).resolves.toMatchObject([
      { id: current.id, name: "Current" },
    ]);
    await expect(browserB.categories.getAllCategories()).resolves.toMatchObject([
      { id: current.id, name: "Current" },
    ]);
  });

  it("does not promote unmarked legacy categories after a reset", async () => {
    const api = sharedFakeApi();
    const resetAt = "2026-08-17T12:00:00.000Z";
    const browserA = browser("browser-a", api, {
      now: () => "2026-08-18T12:00:00.000Z",
    });

    api.records.set("category:legacy", {
      content: {
        archived: false,
        color: "#6C46C3",
        createdAt: "2026-08-18T12:00:00.000Z",
        iconId: "prompt-default",
        id: "legacy",
        name: "Legacy category",
        sortOrder: 0,
        updatedAt: "2026-08-18T12:00:00.000Z",
      },
      createdAt: timestamp,
      deletedAt: null,
      entityType: "category",
      id: "legacy",
      revision: 1,
      schemaVersion: 1,
      updatedAt: timestamp,
    });
    await browserA.accountData.savePromptLibraryReset({
      phase: "complete",
      resetAt,
      retiredStarterIds: ["starter-one"],
    });

    await browserA.accountData.reconcile();

    await expect(browserA.categories.getAllCategories()).resolves.toEqual([]);
  });

  it("shares a starter-library retirement without deleting locally cached old records", async () => {
    const api = sharedFakeApi();
    const browserA = browser("browser-a", api);
    const browserB = browser("browser-b", api);
    const deck = await browserA.decks.createPromptDeck({ title: "Old account deck" });
    await browserB.decks.reconcileAccountData();

    await browserA.accountData.savePromptLibraryReset({
      phase: "complete",
      resetAt: "2026-08-17T12:00:01.000Z",
      retiredStarterIds: ["starter-one"],
    });
    await browserB.decks.reconcileAccountData();

    // Reconciliation must never treat a reset marker as permission to delete
    // a local deck merely because it is absent from the post-reset cloud view.
    // The UI applies the reset as a visibility boundary instead.
    await expect(browserB.decks.getPromptDeckById(deck.id)).resolves.toMatchObject({
      title: "Old account deck",
    });
    await expect(browserB.accountData.getPromptLibraryReset()).resolves.toMatchObject({
      kind: "prompt-library-reset",
      retiredStarterIds: ["starter-one"],
    });
  });

  it("materializes a new account-owned deck created after the reset marker", async () => {
    const api = sharedFakeApi();
    const browserA = browser("browser-a", api);
    const browserB = browser("browser-b", api);

    await browserA.accountData.savePromptLibraryReset({
      phase: "complete",
      resetAt: "2026-08-16T12:00:00.000Z",
      retiredStarterIds: ["starter-one"],
    });
    const newDeck = await browserA.decks.createPromptDeck({
      title: "Fresh library deck",
    });

    await browserB.decks.reconcileAccountData();

    await expect(browserB.decks.getPromptDeckById(newDeck.id)).resolves.toMatchObject({
      title: "Fresh library deck",
    });
  });

  it("keeps a stale browser draft local and leaves the newer cloud revision authoritative", async () => {
    const api = sharedFakeApi();
    const browserA = browser("browser-a", api);
    const browserB = browser("browser-b", api);
    const deck = await browserA.decks.createPromptDeck({ title: "Revision one" });
    await browserB.decks.reconcileAccountData();

    await browserA.decks.updatePromptDeck(deck.id, { title: "Cloud revision two" });
    await browserB.decks.updatePromptDeck(deck.id, { title: "Stale local draft" });

    await expect(browserB.sync.getCached("prompt-deck", deck.id)).resolves.toMatchObject({
      content: { resource: { title: "Stale local draft" } },
      status: accountDataSyncStates.conflict,
    });
    expect(api.records.get(`prompt-deck:${deck.id}`)).toMatchObject({
      content: { resource: { title: "Cloud revision two" } },
      revision: 2,
    });
  });
});
