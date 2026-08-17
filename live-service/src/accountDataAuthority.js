import {
  ACCOUNT_DATA_SCHEMA_VERSION,
  accountDataContentId,
  accountDataEntityTypeSchema,
  projectAccountDataContent,
} from "../../src/models/accountData.js";

export const accountDataErrorCodes = Object.freeze({
  conflict: "revision-conflict",
  invalid: "invalid-account-content",
  notFound: "account-record-not-found",
});

function authorityError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function safeRecord(record) {
  const publicRecord = { ...record };
  delete publicRecord.accountId;
  delete publicRecord.pk;
  delete publicRecord.sk;
  delete publicRecord.lastMutationId;
  return publicRecord;
}

function mutationId(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 200) {
    throw authorityError(accountDataErrorCodes.invalid);
  }
  return value;
}

function makeRecord({
  accountId,
  content,
  entityType,
  id,
  idempotencyId,
  now,
  revision = 1,
}) {
  return {
    accountId,
    content,
    createdAt: now,
    deletedAt: null,
    entityType,
    id,
    lastMutationId: idempotencyId,
    revision,
    schemaVersion: ACCOUNT_DATA_SCHEMA_VERSION,
    updatedAt: now,
  };
}

function parseContent(entityType, id, content) {
  try {
    const safeType = accountDataEntityTypeSchema.parse(entityType);
    const projected = projectAccountDataContent(safeType, content);
    if (accountDataContentId(safeType, projected) !== id)
      throw new Error("mismatched-id");
    return { content: projected, entityType: safeType };
  } catch {
    throw authorityError(accountDataErrorCodes.invalid);
  }
}

export function createAccountDataAuthority({ clock = () => new Date(), store }) {
  const now = () => clock().toISOString();

  async function get({ accountId, entityType, id, includeDeleted = false }) {
    const record = await store.get({ accountId, entityType, id });
    if (!record || (!includeDeleted && record.deletedAt)) {
      throw authorityError(accountDataErrorCodes.notFound);
    }
    return safeRecord(record);
  }

  return {
    async list({ accountId }) {
      const records = await store.list({ accountId });
      return records
        .sort((left, right) =>
          `${left.entityType}:${left.id}`.localeCompare(`${right.entityType}:${right.id}`)
        )
        .map(safeRecord);
    },
    get,
    async create({ accountId, content, entityType, id, idempotencyId }) {
      const parsed = parseContent(entityType, id, content);
      const safeMutationId = mutationId(idempotencyId);
      const record = makeRecord({
        accountId,
        ...parsed,
        id,
        idempotencyId: safeMutationId,
        now: now(),
      });
      const created = await store.create(record);
      if (!created) {
        const current = await store.get({ accountId, entityType: parsed.entityType, id });
        if (current?.lastMutationId === safeMutationId) return safeRecord(current);
        throw authorityError(accountDataErrorCodes.conflict);
      }
      return safeRecord(record);
    },
    async update({
      accountId,
      content,
      entityType,
      expectedRevision,
      id,
      idempotencyId,
    }) {
      const parsed = parseContent(entityType, id, content);
      const safeMutationId = mutationId(idempotencyId);
      if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
        throw authorityError(accountDataErrorCodes.invalid);
      }
      const current = await store.get({ accountId, entityType: parsed.entityType, id });
      if (current?.lastMutationId === safeMutationId) return safeRecord(current);
      if (!current || current.deletedAt)
        throw authorityError(accountDataErrorCodes.notFound);
      const updated = {
        ...current,
        content: parsed.content,
        lastMutationId: safeMutationId,
        revision: current.revision + 1,
        updatedAt: now(),
      };
      const saved = await store.update(updated, expectedRevision);
      if (!saved) throw authorityError(accountDataErrorCodes.conflict);
      return safeRecord(updated);
    },
    async tombstone({ accountId, entityType, expectedRevision, id, idempotencyId }) {
      const safeMutationId = mutationId(idempotencyId);
      const safeType = accountDataEntityTypeSchema.safeParse(entityType);
      if (
        !safeType.success ||
        !Number.isInteger(expectedRevision) ||
        expectedRevision < 1
      ) {
        throw authorityError(accountDataErrorCodes.invalid);
      }
      const current = await store.get({ accountId, entityType: safeType.data, id });
      if (current?.lastMutationId === safeMutationId) return safeRecord(current);
      if (!current || current.deletedAt)
        throw authorityError(accountDataErrorCodes.notFound);
      const deleted = {
        ...current,
        deletedAt: now(),
        lastMutationId: safeMutationId,
        revision: current.revision + 1,
        updatedAt: now(),
      };
      const saved = await store.update(deleted, expectedRevision);
      if (!saved) throw authorityError(accountDataErrorCodes.conflict);
      return safeRecord(deleted);
    },
  };
}
