import { accountDataSyncStates, accountDataSyncService } from "./accountDataSync";
import { getTherapyStudioDatabase } from "./database";
import { deckToRecord, recordToDeck } from "./promptDeckRepositorySupport";

export const PROMPT_AUTHORING_ACKNOWLEDGMENT_VERSION = "1";

const promptEntityType = "prompt-deck";
const categoryEntityType = "category";
const preferenceEntityType = "preference";
const preferenceId = "prompt-authoring";
const libraryResetPreferenceId = "prompt-library-reset";

function isCurrentCategoryRecord(record, taxonomyGeneration) {
  if (!taxonomyGeneration) return true;
  return record.content?.taxonomyGeneration === taxonomyGeneration;
}

export function createPromptAccountDataAdapter({
  database = getTherapyStudioDatabase(),
  sync = accountDataSyncService,
} = {}) {
  const canSync = () => sync.isAvailable();

  async function flush() {
    return sync.processQueue();
  }

  async function trackCreated(deck) {
    if (!canSync()) return { tracked: false };
    await sync.enqueueCreate({
      content: deck,
      entityType: promptEntityType,
      id: deck.id,
    });
    return { ...(await flush()), tracked: true };
  }

  async function saveTracked(deck) {
    if (!canSync()) return { tracked: false };
    const cached = await sync.getCached(promptEntityType, deck.id);
    if (!cached || cached.deletedAt) return { tracked: false };
    await sync.enqueueUpdate({
      content: deck,
      entityType: promptEntityType,
      id: deck.id,
    });
    return { ...(await flush()), tracked: true };
  }

  async function tombstoneTracked(id) {
    if (!canSync()) return { tracked: false };
    const cached = await sync.getCached(promptEntityType, id);
    if (!cached) return { tracked: false };
    await sync.enqueueTombstone({ entityType: promptEntityType, id });
    return { ...(await flush()), tracked: true };
  }

  async function trackCreatedCategory(category) {
    if (!canSync()) return { tracked: false };
    await sync.enqueueCreate({
      content: category,
      entityType: categoryEntityType,
      id: category.id,
    });
    return { ...(await flush()), tracked: true };
  }

  async function saveTrackedCategory(category) {
    if (!canSync()) return { tracked: false };
    const cached = await sync.getCached(categoryEntityType, category.id);
    if (!cached || cached.deletedAt) return { tracked: false };
    await sync.enqueueUpdate({
      content: category,
      entityType: categoryEntityType,
      id: category.id,
    });
    return { ...(await flush()), tracked: true };
  }

  async function tombstoneTrackedCategory(id) {
    if (!canSync()) return { tracked: false };
    const cached = await sync.getCached(categoryEntityType, id);
    if (!cached) return { tracked: false };
    await sync.enqueueTombstone({ entityType: categoryEntityType, id });
    return { ...(await flush()), tracked: true };
  }

  async function removeDeletedDeckReferences(deletedIds) {
    const deletedIdSet = new Set(deletedIds);
    const playlists = database.table("playlists");
    for (const playlist of await playlists.toArray()) {
      const retained = playlist.items.filter((item) => !deletedIdSet.has(item.deckId));
      if (retained.length === playlist.items.length) continue;
      await playlists.put({
        ...playlist,
        items: retained.map((item, sortOrder) => ({ ...item, sortOrder })),
      });
    }
  }

  async function materializePromptCache(knownLocalKeys) {
    const records = await sync.getCachedByType(promptEntityType);
    const libraryReset = await getPromptLibraryReset({ completedOnly: true });
    const resetAt = libraryReset?.resetAt ?? null;
    const applicable = records.filter(
      (record) => record.status !== accountDataSyncStates.conflict
    );
    const collisions = [];
    await database.transaction(
      "rw",
      [
        database.table("resources"),
        database.table("playlists"),
        database.table("resourceMemory"),
      ],
      async () => {
        const resources = database.table("resources");
        const deletedIds = [];
        for (const record of applicable) {
          if (resetAt && record.updatedAt <= resetAt) continue;
          const existing = await resources.get(record.id);
          if (existing && !knownLocalKeys.has(record.entityKey)) {
            collisions.push(record.id);
            continue;
          }
          if (record.deletedAt) {
            await resources.delete(record.id);
            await database.table("resourceMemory").delete(record.id);
            deletedIds.push(record.id);
            continue;
          }
          const deck = recordToDeck({ ...record.content.resource, archived: false });
          await resources.put(deckToRecord(deck, record.content.archived));
        }
        await removeDeletedDeckReferences(deletedIds);
      }
    );
    return collisions;
  }

  async function materializeCategoryCache(knownLocalKeys) {
    const records = await sync.getCachedByType(categoryEntityType);
    const taxonomyGeneration = await getCurrentPromptTaxonomyGeneration();
    const applicable = records.filter(
      (record) => record.status !== accountDataSyncStates.conflict
    );
    const collisions = [];
    await database.transaction("rw", database.table("categories"), async () => {
      const categories = database.table("categories");
      for (const record of applicable) {
        if (!record.deletedAt && !isCurrentCategoryRecord(record, taxonomyGeneration)) {
          // Retain the historical cloud record without rematerializing it into
          // the active post-reset taxonomy.
          continue;
        }
        const existing = await categories.get(record.id);
        if (existing && !knownLocalKeys.has(record.entityKey)) {
          collisions.push(record.id);
          continue;
        }
        if (record.deletedAt) {
          await categories.delete(record.id);
          continue;
        }
        await categories.put(record.content);
      }
    });
    return collisions;
  }

  async function reconcile() {
    if (!canSync()) return { collisions: [], status: accountDataSyncStates.localOnly };
    const knownDeckKeys = new Set(
      (await sync.getCachedByType(promptEntityType)).map(({ entityKey }) => entityKey)
    );
    const knownCategoryKeys = new Set(
      (await sync.getCachedByType(categoryEntityType)).map(({ entityKey }) => entityKey)
    );
    const result = await sync.reconcile();
    const [deckCollisions, categoryCollisions] = await Promise.all([
      materializePromptCache(knownDeckKeys),
      materializeCategoryCache(knownCategoryKeys),
    ]);
    const collisions = [...deckCollisions, ...categoryCollisions];
    return {
      ...result,
      collisions,
      status: collisions.length ? accountDataSyncStates.conflict : result.status,
    };
  }

  async function saveAuthoringAcknowledgment(
    version = PROMPT_AUTHORING_ACKNOWLEDGMENT_VERSION
  ) {
    if (!canSync()) return { tracked: false };
    const content = { promptAuthoringAcknowledgmentVersion: version };
    const cached = await sync.getCached(preferenceEntityType, preferenceId);
    if (cached) {
      await sync.enqueueUpdate({
        content,
        entityType: preferenceEntityType,
        id: preferenceId,
      });
    } else {
      await sync.enqueueCreate({
        content,
        entityType: preferenceEntityType,
        id: preferenceId,
      });
    }
    return { ...(await flush()), tracked: true };
  }

  async function getAuthoringAcknowledgment() {
    if (!canSync()) return null;
    const cached = await sync.getCached(preferenceEntityType, preferenceId);
    return cached?.deletedAt
      ? null
      : (cached?.content?.promptAuthoringAcknowledgmentVersion ?? null);
  }

  async function getPromptLibraryReset({ completedOnly = false } = {}) {
    if (!canSync()) return null;
    const cached = await sync.getCached(preferenceEntityType, libraryResetPreferenceId);
    if (cached?.deletedAt) return null;
    const content = cached?.content;
    if (content?.kind !== "prompt-library-reset") return null;
    return completedOnly && content.phase !== "complete" ? null : content;
  }

  async function getCurrentPromptTaxonomyGeneration() {
    const reset = await getPromptLibraryReset({ completedOnly: true });
    return reset?.resetAt ?? null;
  }

  async function savePromptLibraryReset({ phase, resetAt, retiredStarterIds }) {
    if (!canSync()) return { tracked: false };
    const content = {
      kind: "prompt-library-reset",
      phase,
      resetAt,
      retiredStarterIds: [...retiredStarterIds],
      version: 1,
    };
    const cached = await sync.getCached(preferenceEntityType, libraryResetPreferenceId);
    if (cached && !cached.deletedAt) {
      await sync.enqueueUpdate({
        content,
        entityType: preferenceEntityType,
        id: libraryResetPreferenceId,
      });
    } else {
      await sync.enqueueCreate({
        content,
        entityType: preferenceEntityType,
        id: libraryResetPreferenceId,
      });
    }
    return { ...(await flush()), tracked: true };
  }

  async function tombstoneDecks(ids) {
    if (!canSync()) return { tracked: false };
    for (const id of ids) {
      const cached = await sync.getCached(promptEntityType, id);
      if (cached && !cached.deletedAt) {
        await sync.enqueueTombstone({ entityType: promptEntityType, id });
      }
    }
    return { ...(await flush()), tracked: true };
  }

  async function getDeckSyncRecords() {
    if (!canSync()) return new Map();
    return new Map(
      (await sync.getCachedByType(promptEntityType)).map((record) => [record.id, record])
    );
  }

  return {
    getDeckSyncRecords,
    getAuthoringAcknowledgment,
    getCurrentPromptTaxonomyGeneration,
    getPromptLibraryReset,
    isAvailable: canSync,
    reconcile,
    savePromptLibraryReset,
    saveAuthoringAcknowledgment,
    saveTracked,
    saveTrackedCategory,
    tombstoneTracked,
    tombstoneTrackedCategory,
    tombstoneDecks,
    trackCreated,
    trackCreatedCategory,
  };
}

export const promptAccountDataAdapter = createPromptAccountDataAdapter();
