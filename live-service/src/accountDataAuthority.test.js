import { describe, expect, it } from "vitest";

import {
  accountDataErrorCodes,
  createAccountDataAuthority,
} from "./accountDataAuthority.js";

const timestamp = "2026-08-16T12:00:00.000Z";

function memoryStore() {
  const records = new Map();
  const key = ({ accountId, entityType, id }) => `${accountId}:${entityType}:${id}`;
  return {
    async get(identity) {
      return records.get(key(identity));
    },
    async list({ accountId }) {
      return [...records.values()].filter((record) => record.accountId === accountId);
    },
    async create(record) {
      const recordKey = key(record);
      if (records.has(recordKey)) return false;
      records.set(recordKey, structuredClone(record));
      return true;
    },
    async update(record, expectedRevision) {
      const recordKey = key(record);
      const current = records.get(recordKey);
      if (!current || current.revision !== expectedRevision) return false;
      records.set(recordKey, structuredClone(record));
      return true;
    },
  };
}

function promptDeck(id = "deck-1", title = "First deck") {
  return {
    id,
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

function promptCategory(id = "category-1", name = "Connection") {
  return {
    archived: false,
    color: "#6C46C3",
    createdAt: timestamp,
    iconId: "prompt-default",
    id,
    name,
    sortOrder: 0,
    updatedAt: timestamp,
  };
}

describe("Account Data authority", () => {
  it("scopes records to the authenticated account", async () => {
    const authority = createAccountDataAuthority({ store: memoryStore() });
    await authority.create({
      accountId: "host-a",
      content: promptDeck(),
      entityType: "prompt-deck",
      id: "deck-1",
      idempotencyId: "create-1",
    });

    await expect(authority.list({ accountId: "host-b" })).resolves.toEqual([]);
    await expect(
      authority.get({ accountId: "host-b", entityType: "prompt-deck", id: "deck-1" })
    ).rejects.toMatchObject({ code: accountDataErrorCodes.notFound });
  });

  it("accepts the already-projected client payload without broadening it", async () => {
    const authority = createAccountDataAuthority({ store: memoryStore() });
    const created = await authority.create({
      accountId: "host-a",
      content: { archived: false, resource: promptDeck() },
      entityType: "prompt-deck",
      id: "deck-1",
      idempotencyId: "create-1",
    });

    expect(created.content).toEqual({
      archived: false,
      resource: expect.objectContaining({ id: "deck-1", title: "First deck" }),
    });
    expect(created).not.toHaveProperty("accountId");
    expect(created).not.toHaveProperty("pk");
    expect(created).not.toHaveProperty("sk");
  });

  it("accepts an account-owned Prompt category through the same protected authority", async () => {
    const authority = createAccountDataAuthority({ store: memoryStore() });
    const created = await authority.create({
      accountId: "host-a",
      content: promptCategory(),
      entityType: "category",
      id: "category-1",
      idempotencyId: "category-create-1",
    });

    expect(created).toMatchObject({
      content: { id: "category-1", name: "Connection" },
      entityType: "category",
    });
  });

  it("requires the current revision and preserves the cloud version on conflict", async () => {
    const authority = createAccountDataAuthority({ store: memoryStore() });
    const created = await authority.create({
      accountId: "host-a",
      content: promptDeck(),
      entityType: "prompt-deck",
      id: "deck-1",
      idempotencyId: "create-1",
    });
    const updated = await authority.update({
      accountId: "host-a",
      content: promptDeck("deck-1", "Browser B"),
      entityType: "prompt-deck",
      expectedRevision: created.revision,
      id: "deck-1",
      idempotencyId: "update-1",
    });

    await expect(
      authority.update({
        accountId: "host-a",
        content: promptDeck("deck-1", "Stale Browser A"),
        entityType: "prompt-deck",
        expectedRevision: created.revision,
        id: "deck-1",
        idempotencyId: "update-stale",
      })
    ).rejects.toMatchObject({ code: accountDataErrorCodes.conflict });

    expect(
      (
        await authority.get({
          accountId: "host-a",
          entityType: "prompt-deck",
          id: "deck-1",
        })
      ).content.resource.title
    ).toBe("Browser B");
    expect(updated.revision).toBe(2);
  });

  it("returns the prior result when the same mutation is retried", async () => {
    const authority = createAccountDataAuthority({ store: memoryStore() });
    const input = {
      accountId: "host-a",
      content: promptDeck(),
      entityType: "prompt-deck",
      id: "deck-1",
      idempotencyId: "create-retry",
    };
    const created = await authority.create(input);
    await expect(authority.create(input)).resolves.toEqual(created);

    const update = {
      accountId: "host-a",
      content: promptDeck("deck-1", "Updated once"),
      entityType: "prompt-deck",
      expectedRevision: created.revision,
      id: "deck-1",
      idempotencyId: "update-retry",
    };
    const updated = await authority.update(update);
    await expect(authority.update(update)).resolves.toEqual(updated);

    const deletion = {
      accountId: "host-a",
      entityType: "prompt-deck",
      expectedRevision: updated.revision,
      id: "deck-1",
      idempotencyId: "delete-retry",
    };
    const deleted = await authority.tombstone(deletion);
    await expect(authority.tombstone(deletion)).resolves.toEqual(deleted);
  });

  it("uses revision-aware tombstones instead of destructive deletes", async () => {
    const authority = createAccountDataAuthority({ store: memoryStore() });
    const created = await authority.create({
      accountId: "host-a",
      content: promptDeck(),
      entityType: "prompt-deck",
      id: "deck-1",
      idempotencyId: "create-1",
    });
    const deleted = await authority.tombstone({
      accountId: "host-a",
      entityType: "prompt-deck",
      expectedRevision: created.revision,
      id: "deck-1",
      idempotencyId: "delete-1",
    });

    expect(deleted.deletedAt).toBeTruthy();
    await expect(
      authority.get({ accountId: "host-a", entityType: "prompt-deck", id: "deck-1" })
    ).rejects.toMatchObject({ code: accountDataErrorCodes.notFound });
    await expect(authority.list({ accountId: "host-a" })).resolves.toEqual([
      expect.objectContaining({ deletedAt: expect.any(String), id: "deck-1" }),
    ]);
  });
});
