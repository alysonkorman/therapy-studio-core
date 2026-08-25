import { PROMPT_LIBRARY_RECOVERY_FORMAT } from "../../engines/prompts/promptLibraryRecovery";

function safeTimestamp(value) {
  return value.replace(/[:.]/gu, "-");
}

export function downloadPromptLibraryRecovery(snapshot) {
  const blob = new Blob([`${JSON.stringify(snapshot, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${PROMPT_LIBRARY_RECOVERY_FORMAT}-${safeTimestamp(
    snapshot.exportedAt
  )}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
