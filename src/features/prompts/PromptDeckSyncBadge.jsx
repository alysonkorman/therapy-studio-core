import {
  getPromptDeckPersistenceStatus,
  promptDeckPersistenceLabels,
} from "./promptDeckPersistenceStatus";

const descriptions = {
  "built-in": "Included with Therapy Studio. It is not an account-owned deck.",
  conflict: "This deck needs review before its local and account versions can reconcile.",
  "local-only": "This deck is stored only on this device.",
  "offline-saved-locally":
    "Your changes are safely stored here and will sync when a connection is available.",
  "retired-built-in": "This built-in deck is hidden from the active library.",
  saved: "This account-owned deck is saved to your Therapy Studio account.",
  saving: "This account-owned deck is being saved to your Therapy Studio account.",
};

export default function PromptDeckSyncBadge({ builtIn, deck, record }) {
  const status = getPromptDeckPersistenceStatus({ builtIn, deck, record });
  return (
    <span
      aria-label={`Persistence status: ${promptDeckPersistenceLabels[status]}`}
      className={`prompt-deck-persistence-status prompt-deck-persistence-status--${status}`}
      title={descriptions[status]}
    >
      {promptDeckPersistenceLabels[status]}
    </span>
  );
}
