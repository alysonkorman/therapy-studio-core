import { PROMPT_LIBRARY_STORED_RECORDS_EXPORT_FORMAT } from "../../engines/prompts/promptLibraryStoredRecordsExport";

function safeTimestamp(value) {
  return value.replace(/[:.]/gu, "-");
}

export function downloadPromptLibraryStoredRecordsExport(snapshot) {
  const json = `${JSON.stringify(snapshot, null, 2)}\n`;
  JSON.parse(json);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${PROMPT_LIBRARY_STORED_RECORDS_EXPORT_FORMAT}-${safeTimestamp(
    snapshot.exportedAt
  )}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
