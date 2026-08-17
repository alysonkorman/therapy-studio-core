import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import { AccountDataApiError } from "./accountDataClient";
import { createAccountDataSyncService, accountDataSyncStates } from "./accountDataSync";
import { createTherapyStudioDatabase } from "./database";
import {
  createPromptAccountDataAdapter,
  PROMPT_AUTHORING_ACKNOWLEDGMENT_VERSION,
} from "./promptAccountDataAdapter";
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

function browser(label, api) {
  const database = createDatabase(label);
  const sync = createAccountDataSyncService({
    api,
    database,
    getToken: () => "same-cognito-account",
    now: () => timestamp,
  });
  const accountData = createPromptAccountDataAdapter({ database, sync });
  let id = 0;
  const decks = createPromptDeckRepository({
    accountData,
    createId: () => `${label}-${++id}`,
    database,
    now: () => timestamp,
  });
  return { accountData, database, decks, sync };
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
