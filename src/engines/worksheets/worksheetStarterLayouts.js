import { addWorksheetBlock } from "./worksheetDocumentOperations";

export const worksheetStarterLayouts = [
  { id: "blank", label: "Blank Worksheet" },
  { id: "reflection", label: "Reflection Worksheet" },
  { id: "checklist", label: "Checklist Worksheet" },
];

export function applyWorksheetStarter(document, starterId, createId) {
  const pageId = document.pages[0].id;
  if (starterId === "reflection") {
    let next = addWorksheetBlock(document, pageId, "heading", createId);
    next = addWorksheetBlock(next, pageId, "long-response", createId);
    return next;
  }
  if (starterId === "checklist") {
    let next = addWorksheetBlock(document, pageId, "heading", createId);
    next = addWorksheetBlock(next, pageId, "checklist", createId);
    return next;
  }
  return document;
}
