import { nanoid } from "nanoid";

import { createPromptLibraryRecoverySnapshot as buildRecoverySnapshot } from "../../engines/prompts/promptLibraryRecovery";
import { createPromptLibraryStoredRecordsExport as buildStoredRecordsExport } from "../../engines/prompts/promptLibraryStoredRecordsExport";
import { promptAccountDataAdapter } from "./promptAccountDataAdapter";
import { createResourceRepository } from "./resourceRepository";
import { getTherapyStudioDatabase } from "./database";
import {
  assertOnlyFields,
  assertUniqueIds,
  authoringError,
  authoringErrorCodes,
  ensureAuthoringDatabaseOpen,
  normalizeMetadataValues,
  rethrowAuthoringError,
} from "./promptAuthoringRepositoryUtils";
import {
  assertPromptDeckResource,
  deckFields,
  deckToRecord,
  metadataFields,
  parseDeck,
  parsePrompt,
  preparedPrompt,
  promptDecksFromResources,
  promptFields,
  recordToDeck,
} from "./promptDeckRepositorySupport";

export function createPromptDeckRepository({
  database = getTherapyStudioDatabase(),
  now = () => new Date().toISOString(),
  createId = () => nanoid(),
  accountData = promptAccountDataAdapter,
} = {}) {
  const resourceRepository = createResourceRepository({ database, now });

  async function deletePromptDeck(id) {
    const result = await deletePromptDecks([id]);
    return result.hiddenBuiltInIds.includes(id) ? { id, hidden: true } : { id };
  }

  async function deletePromptDecks(ids) {
    await ensureAuthoringDatabaseOpen(database);
    assertUniqueIds(ids, ids);
    try {
      const result = await database.transaction(
        "rw",
        [
          database.table("resources"),
          database.table("playlists"),
          database.table("resourceMemory"),
        ],
        async () => {
          const resources = database.table("resources");
          const records = await Promise.all(ids.map((id) => resources.get(id)));
          for (const [index, record] of records.entries()) {
            if (!record || record.type !== "prompt-deck") {
              throw authoringError(
                authoringErrorCodes.notFound,
                `Prompt Deck not found: ${ids[index]}`
              );
            }
          }

          const deletedIds = [];
          for (const [index, record] of records.entries()) {
            const id = ids[index];
            await resources.delete(id);
            await database.table("resourceMemory").delete(id);
            deletedIds.push(id);
          }

          const deletedIdSet = new Set(deletedIds);
          const playlists = database.table("playlists");
          for (const playlist of await playlists.toArray()) {
            const retained = playlist.items.filter(
              (item) => !deletedIdSet.has(item.deckId)
            );
            if (retained.length === playlist.items.length) continue;
            await playlists.put({
              ...playlist,
              items: retained.map((item, sortOrder) => ({ ...item, sortOrder })),
              updatedAt: now(),
            });
          }

          return { deletedIds, hiddenBuiltInIds: [] };
        }
      );
      for (const id of result.deletedIds) await accountData.tombstoneTracked(id);
      return result;
    } catch (error) {
      rethrowAuthoringError(
        error,
        authoringErrorCodes.transactionFailed,
        "Prompt Decks could not be removed."
      );
    }
  }

  async function getAllPromptDecks({ includeArchived = false } = {}) {
    const resources = await resourceRepository.getAllResources({ includeArchived: true });
    return promptDecksFromResources(resources, includeArchived);
  }

  const reconcileAccountData = () => accountData.reconcile();
  const getPromptDeckSyncRecords = () => accountData.getDeckSyncRecords?.() ?? new Map();
  const getPromptAuthoringAcknowledgment = () => accountData.getAuthoringAcknowledgment();
  const getPromptLibraryReset = (options) =>
    accountData.getPromptLibraryReset?.(options) ?? null;
  const savePromptAuthoringAcknowledgment = (version) =>
    accountData.saveAuthoringAcknowledgment(version);

  async function previewPromptLibraryReset() {
    await ensureAuthoringDatabaseOpen(database);
    const syncResult = await accountData.reconcile?.();
    const decks = await getAllPromptDecks({ includeArchived: true });
    const categories = await database.table("categories").toArray();
    const records = (await accountData.getDeckSyncRecords?.()) ?? new Map();
    const accountOwnedIds = new Set(records.keys());
    const conflictCount = [...records.values()].filter(
      (record) => record.status === "conflict"
    ).length;
    const unsyncedCount = [...records.values()].filter(
      (record) => record.status !== "saved" && record.status !== "conflict"
    ).length;
    return {
      activeDeckCount: decks.filter((deck) => !deck.archived).length,
      accountOwnedDeckCount: decks.filter((deck) => accountOwnedIds.has(deck.id)).length,
      archivedDeckCount: decks.filter((deck) => deck.archived).length,
      activeCategoryCount: categories.filter((category) => !category.archived).length,
      archivedCategoryCount: categories.filter((category) => category.archived).length,
      builtInDeckCount: 0,
      bundledStarterCount: 0,
      conflictCount,
      localOnlyDeckCount: decks.filter((deck) => !accountOwnedIds.has(deck.id)).length,
      syncStatus: syncResult?.status ?? "local-only",
      therapistDeckCount: decks.length,
      totalDeckCount: decks.length,
      unsyncedCount,
    };
  }

  async function createPromptLibraryRecoverySnapshot() {
    await ensureAuthoringDatabaseOpen(database);
    return buildRecoverySnapshot({
      decks: await getAllPromptDecks({ includeArchived: true }),
      categories: await database.table("categories").toArray(),
      exportedAt: now(),
      playlists: await database.table("playlists").toArray(),
    });
  }

  async function createPromptLibraryStoredRecordsExport({ visibleDeckIds = [] } = {}) {
    await ensureAuthoringDatabaseOpen(database);
    const [resources, categories, playlists] = await Promise.all([
      database.table("resources").toArray(),
      database.table("categories").toArray(),
      database.table("playlists").toArray(),
    ]);
    return buildStoredRecordsExport({
      categories,
      exportedAt: now(),
      playlists,
      resources,
      visibleDeckIds,
    });
  }

  async function resetPromptLibrary() {
    await ensureAuthoringDatabaseOpen(database);
    if (!accountData.isAvailable?.()) {
      throw authoringError(
        authoringErrorCodes.transactionFailed,
        "Sign in and reconnect to Account Data before resetting the Prompt Library."
      );
    }
    const reconciliation = await accountData.reconcile?.();
    if (reconciliation?.status !== "saved" || reconciliation?.collisions?.length) {
      throw authoringError(
        authoringErrorCodes.transactionFailed,
        "Prompt Library reset needs a healthy Account Data connection with no conflicts."
      );
    }
    const existingReset = await getPromptLibraryReset({ completedOnly: false });
    const resetAt = existingReset?.resetAt ?? now();
    const decks = await getAllPromptDecks({ includeArchived: true });
    const records = (await accountData.getDeckSyncRecords?.()) ?? new Map();
    const activeRecordIds = [...records.values()]
      .filter((record) => !record.deletedAt)
      .map((record) => record.id);
    const retiredDeckIds = decks.map((deck) => deck.id);
    if (existingReset?.phase !== "complete") {
      const marker = await accountData.savePromptLibraryReset({
        phase: "pending",
        resetAt,
        retiredStarterIds: retiredDeckIds,
      });
      if (marker.status !== "saved") {
        throw authoringError(
          authoringErrorCodes.transactionFailed,
          "Prompt Library retirement could not be confirmed. Your library is unchanged."
        );
      }
      const tombstones = await accountData.tombstoneDecks(activeRecordIds);
      if (tombstones.status !== "saved") {
        throw authoringError(
          authoringErrorCodes.transactionFailed,
          "Prompt deck deletion is waiting for cloud sync. Your library is unchanged."
        );
      }
      const completedMarker = await accountData.savePromptLibraryReset({
        phase: "complete",
        resetAt,
        retiredStarterIds: retiredDeckIds,
      });
      if (completedMarker.status !== "saved") {
        throw authoringError(
          authoringErrorCodes.transactionFailed,
          "Prompt Library reset could not be finalized. Your library is unchanged."
        );
      }
    }
    const result = await database.transaction(
      "rw",
      [
        database.table("resources"),
        database.table("playlists"),
        database.table("resourceMemory"),
      ],
      async () => {
        const resources = database.table("resources");
        const decks = (await resources.toArray()).filter(
          (record) => record.type === "prompt-deck"
        );
        const ids = decks.map(({ id }) => id);
        for (const id of ids) {
          await resources.delete(id);
          await database.table("resourceMemory").delete(id);
        }
        const idSet = new Set(ids);
        const playlists = database.table("playlists");
        for (const playlist of await playlists.toArray()) {
          const items = playlist.items.filter((item) => !idSet.has(item.deckId));
          if (items.length === playlist.items.length) continue;
          await playlists.put({
            ...playlist,
            items: items.map((item, sortOrder) => ({ ...item, sortOrder })),
            updatedAt: resetAt,
          });
        }
        return { removedDeckIds: ids };
      }
    );
    return { ...result, resetAt };
  }

  async function getPromptDeckById(id) {
    return assertPromptDeckResource(await resourceRepository.getResourceById(id), id);
  }

  async function createPromptDeck(input) {
    assertOnlyFields(input, deckFields);
    const timestamp = now();
    const existing = await getAllPromptDecks({ includeArchived: true });
    const deck = parseDeck({
      id: createId(),
      type: "prompt-deck",
      title: input.title,
      description: input.description ?? "",
      category: input.category ?? "",
      categoryId: input.categoryId ?? null,
      color: input.color ?? "#6C46C3",
      iconId: input.iconId ?? "prompt-default",
      sortOrder: existing.length,
      diagnoses: normalizeMetadataValues(input.diagnoses ?? []),
      goals: normalizeMetadataValues(input.goals ?? []),
      ageRanges: normalizeMetadataValues(input.ageRanges ?? []),
      tags: normalizeMetadataValues(input.tags ?? []),
      prompts: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const created = await resourceRepository.createResourceRecord(deck);
    await accountData.trackCreated(created);
    return created;
  }

  async function updatePromptDeck(id, changes) {
    assertOnlyFields(changes, deckFields);
    const normalized = { ...changes };
    for (const field of metadataFields) {
      if (field in normalized)
        normalized[field] = normalizeMetadataValues(normalized[field]);
    }
    const updated = await resourceRepository.updateResourceRecord(id, normalized);
    await accountData.saveTracked(updated);
    return updated;
  }

  async function duplicatePromptDeck(id) {
    const source = await getPromptDeckById(id);
    const sourceDeck = { ...source };
    delete sourceDeck.archived;
    const timestamp = now();
    const decks = await getAllPromptDecks({ includeArchived: true });
    const duplicate = parseDeck({
      ...sourceDeck,
      id: createId(),
      title: `${source.title} Copy`,
      sortOrder: decks.length,
      prompts: source.prompts.map((prompt, index) => ({
        ...prompt,
        id: createId(),
        sortOrder: index,
      })),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const created = await resourceRepository.createResourceRecord(duplicate);
    await accountData.trackCreated(created);
    return created;
  }

  async function archivePromptDeck(id) {
    const archived = await resourceRepository.archiveResource(id);
    await accountData.saveTracked(archived);
    return archived;
  }

  async function restorePromptDeck(id) {
    const restored = await resourceRepository.restoreResource(id);
    await accountData.saveTracked(restored);
    return restored;
  }

  async function reorderPromptDecks(orderedIds) {
    await ensureAuthoringDatabaseOpen(database);
    const decks = await getAllPromptDecks({ includeArchived: true });
    assertUniqueIds(
      orderedIds,
      decks.map(({ id }) => id)
    );
    try {
      await database.transaction("rw", database.table("resources"), async () => {
        const table = database.table("resources");
        for (const [sortOrder, id] of orderedIds.entries()) {
          const record = await table.get(id);
          const deck = recordToDeck(record);
          await table.put(
            deckToRecord({ ...deck, sortOrder, updatedAt: now() }, record.archived)
          );
        }
      });
      return getAllPromptDecks({ includeArchived: true });
    } catch (error) {
      rethrowAuthoringError(
        error,
        authoringErrorCodes.transactionFailed,
        "Deck order could not be saved."
      );
    }
  }

  async function mutateDeck(id, mutation, message) {
    await ensureAuthoringDatabaseOpen(database);
    try {
      const result = await database.transaction(
        "rw",
        database.table("resources"),
        async () => {
          const table = database.table("resources");
          const record = await table.get(id);
          if (!record || record.type !== "prompt-deck") {
            throw authoringError(
              authoringErrorCodes.notFound,
              `Prompt Deck not found: ${id}`
            );
          }
          const current = recordToDeck(record);
          const changed = parseDeck({ ...mutation(current), updatedAt: now() });
          await table.put(deckToRecord(changed, record.archived));
          return { ...changed, archived: record.archived };
        }
      );
      await accountData.saveTracked(result);
      return result;
    } catch (error) {
      rethrowAuthoringError(error, authoringErrorCodes.transactionFailed, message);
    }
  }

  function addPrompt(deckId, input) {
    assertOnlyFields(input, promptFields);
    return mutateDeck(
      deckId,
      (deck) => ({
        ...deck,
        prompts: [
          ...deck.prompts,
          preparedPrompt(input, { id: createId(), sortOrder: deck.prompts.length }),
        ],
      }),
      "Prompt could not be added."
    );
  }

  async function bulkAddPrompts(deckId, promptTexts) {
    if (!Array.isArray(promptTexts)) {
      throw authoringError(
        authoringErrorCodes.invalidInput,
        "Bulk prompts must be an array."
      );
    }
    const texts = promptTexts.map((text) => String(text).trim()).filter(Boolean);
    if (!texts.length) {
      throw authoringError(authoringErrorCodes.invalidInput, "Add at least one prompt.");
    }
    return mutateDeck(
      deckId,
      (deck) => ({
        ...deck,
        prompts: [
          ...deck.prompts,
          ...texts.map((text, index) =>
            preparedPrompt(
              { text },
              { id: createId(), sortOrder: deck.prompts.length + index }
            )
          ),
        ],
      }),
      "Prompt batch could not be added."
    );
  }

  function updatePrompt(deckId, promptId, changes) {
    assertOnlyFields(changes, promptFields);
    return mutateDeck(
      deckId,
      (deck) => {
        const index = deck.prompts.findIndex(({ id }) => id === promptId);
        if (index < 0)
          throw authoringError(
            authoringErrorCodes.notFound,
            `Prompt not found: ${promptId}`
          );
        const normalized = { ...changes };
        for (const field of metadataFields) {
          if (field in normalized)
            normalized[field] = normalizeMetadataValues(normalized[field]);
        }
        const prompts = [...deck.prompts];
        prompts[index] = parsePrompt({ ...prompts[index], ...normalized });
        return { ...deck, prompts };
      },
      "Prompt could not be updated."
    );
  }

  function duplicatePrompt(deckId, promptId) {
    return mutateDeck(
      deckId,
      (deck) => {
        const index = deck.prompts.findIndex(({ id }) => id === promptId);
        if (index < 0)
          throw authoringError(
            authoringErrorCodes.notFound,
            `Prompt not found: ${promptId}`
          );
        const prompts = [...deck.prompts];
        prompts.splice(index + 1, 0, { ...prompts[index], id: createId() });
        return {
          ...deck,
          prompts: prompts.map((prompt, sortOrder) => ({ ...prompt, sortOrder })),
        };
      },
      "Prompt could not be duplicated."
    );
  }

  function deletePrompt(deckId, promptId) {
    return mutateDeck(
      deckId,
      (deck) => {
        if (!deck.prompts.some(({ id }) => id === promptId)) {
          throw authoringError(
            authoringErrorCodes.notFound,
            `Prompt not found: ${promptId}`
          );
        }
        return {
          ...deck,
          prompts: deck.prompts
            .filter(({ id }) => id !== promptId)
            .map((prompt, sortOrder) => ({ ...prompt, sortOrder })),
        };
      },
      "Prompt could not be deleted."
    );
  }

  function reorderPrompts(deckId, orderedPromptIds) {
    return mutateDeck(
      deckId,
      (deck) => {
        assertUniqueIds(
          orderedPromptIds,
          deck.prompts.map(({ id }) => id)
        );
        const prompts = new Map(deck.prompts.map((prompt) => [prompt.id, prompt]));
        return {
          ...deck,
          prompts: orderedPromptIds.map((id, sortOrder) => ({
            ...prompts.get(id),
            sortOrder,
          })),
        };
      },
      "Prompt order could not be saved."
    );
  }

  async function transferPrompt(sourceDeckId, promptId, targetDeckId, targetIndex, copy) {
    await ensureAuthoringDatabaseOpen(database);
    try {
      return await database.transaction("rw", database.table("resources"), async () => {
        const table = database.table("resources");
        const sourceRecord = await table.get(sourceDeckId);
        const targetRecord = await table.get(targetDeckId);
        const source = recordToDeck(sourceRecord);
        const target =
          sourceDeckId === targetDeckId ? source : recordToDeck(targetRecord);
        const prompt = source.prompts.find(({ id }) => id === promptId);
        if (!prompt)
          throw authoringError(
            authoringErrorCodes.notFound,
            `Prompt not found: ${promptId}`
          );
        const insertionIndex = Math.min(
          Math.max(targetIndex ?? target.prompts.length, 0),
          target.prompts.length
        );
        const transferred = { ...prompt, id: copy ? createId() : prompt.id };
        let sourcePrompts = copy
          ? source.prompts
          : source.prompts.filter(({ id }) => id !== promptId);
        let targetPrompts =
          sourceDeckId === targetDeckId ? sourcePrompts : target.prompts;
        targetPrompts = [...targetPrompts];
        targetPrompts.splice(insertionIndex, 0, transferred);
        const timestamp = now();
        const nextTarget = parseDeck({
          ...target,
          prompts: targetPrompts.map((item, sortOrder) => ({ ...item, sortOrder })),
          updatedAt: timestamp,
        });
        await table.put(deckToRecord(nextTarget, targetRecord.archived));
        if (sourceDeckId !== targetDeckId && !copy) {
          const nextSource = parseDeck({
            ...source,
            prompts: sourcePrompts.map((item, sortOrder) => ({ ...item, sortOrder })),
            updatedAt: timestamp,
          });
          await table.put(deckToRecord(nextSource, sourceRecord.archived));
        }
        return nextTarget;
      });
    } catch (error) {
      rethrowAuthoringError(
        error,
        authoringErrorCodes.transactionFailed,
        "Prompt transfer failed."
      );
    }
  }

  const movePrompt = (sourceDeckId, promptId, targetDeckId, targetIndex) =>
    transferPrompt(sourceDeckId, promptId, targetDeckId, targetIndex, false);
  const copyPrompt = (sourceDeckId, promptId, targetDeckId, targetIndex) =>
    transferPrompt(sourceDeckId, promptId, targetDeckId, targetIndex, true);
  return {
    reconcileAccountData,
    getPromptDeckSyncRecords,
    getPromptAuthoringAcknowledgment,
    getPromptLibraryReset,
    savePromptAuthoringAcknowledgment,
    getAllPromptDecks,
    getPromptDeckById,
    createPromptDeck,
    updatePromptDeck,
    duplicatePromptDeck,
    deletePromptDeck,
    deletePromptDecks,
    archivePromptDeck,
    restorePromptDeck,
    reorderPromptDecks,
    createPromptLibraryRecoverySnapshot,
    createPromptLibraryStoredRecordsExport,
    previewPromptLibraryReset,
    resetPromptLibrary,
    addPrompt,
    bulkAddPrompts,
    updatePrompt,
    duplicatePrompt,
    deletePrompt,
    reorderPrompts,
    movePrompt,
    copyPrompt,
  };
}

export const promptDeckRepository = createPromptDeckRepository();
