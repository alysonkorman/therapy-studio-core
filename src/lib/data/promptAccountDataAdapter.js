import { accountDataSyncStates, accountDataSyncService } from "./accountDataSync";
import { getTherapyStudioDatabase } from "./database";
import { deckToRecord, recordToDeck } from "./promptDeckRepositorySupport";

export const PROMPT_AUTHORING_ACKNOWLEDGMENT_VERSION = "1";

const promptEntityType = "prompt-deck";
const preferenceEntityType = "preference";
const preferenceId = "prompt-authoring";

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

  async function reconcile() {
    if (!canSync()) return { collisions: [], status: accountDataSyncStates.localOnly };
    const knownLocalKeys = new Set(
      (await sync.getCachedByType(promptEntityType)).map(({ entityKey }) => entityKey)
    );
    const result = await sync.reconcile();
    const collisions = await materializePromptCache(knownLocalKeys);
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

  return {
    getAuthoringAcknowledgment,
    isAvailable: canSync,
    reconcile,
    saveAuthoringAcknowledgment,
    saveTracked,
    tombstoneTracked,
    trackCreated,
  };
}

export const promptAccountDataAdapter = createPromptAccountDataAdapter();
