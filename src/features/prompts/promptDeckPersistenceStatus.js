import { accountDataSyncStates } from "../../lib/data/accountDataSync";

export const promptDeckPersistenceLabels = Object.freeze({
  "built-in": "Built-in",
  conflict: "Conflict",
  "local-only": "Local only",
  "offline-saved-locally": "Offline — saved locally",
  "retired-built-in": "Retired built-in",
  saved: "Synced",
  saving: "Saving…",
});

export function getPromptDeckPersistenceStatus({ builtIn, deck, record }) {
  if (builtIn) return deck.archived ? "retired-built-in" : "built-in";
  if (!record) return "local-only";
  if (record.status === accountDataSyncStates.conflict) return "conflict";
  if (record.status === accountDataSyncStates.saving) return "saving";
  if (record.status === accountDataSyncStates.offlineSavedLocally)
    return "offline-saved-locally";
  return record.status === accountDataSyncStates.saved ? "saved" : "local-only";
}

export function summarizePromptDeckPersistence(decks, recordsByDeckId, builtInIds) {
  const summary = { builtIn: 0, conflicts: 0, localOnly: 0, synced: 0 };
  for (const deck of decks) {
    const status = getPromptDeckPersistenceStatus({
      builtIn: builtInIds.has(deck.id),
      deck,
      record: recordsByDeckId.get(deck.id),
    });
    if (status === "built-in" || status === "retired-built-in") summary.builtIn += 1;
    else if (status === "conflict") summary.conflicts += 1;
    else if (status === "saved") summary.synced += 1;
    else if (status === "local-only") summary.localOnly += 1;
  }
  return summary;
}
