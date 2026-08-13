import {
  addWorksheetBlock,
  setWorksheetPageLayoutMode,
  updateWorksheetBlock,
  updateWorksheetBlockLayout,
} from "./worksheetDocumentOperations";

export const worksheetStarterLayouts = [
  { id: "blank", label: "Blank Worksheet" },
  { id: "reflection", label: "Reflection Worksheet" },
  { id: "checklist", label: "Checklist Worksheet" },
  { id: "blank-freeform", label: "Blank Freeform Page" },
  { id: "visual-labels", label: "Big Visual + Labels" },
  { id: "decorate", label: "Decorate This" },
  { id: "map", label: "Map It Out" },
  { id: "reflection-visual", label: "Reflection + Visual" },
];

function addFreeformBlock(document, pageId, type, layout, changes, createId) {
  const next = addWorksheetBlock(document, pageId, type, createId);
  const block = next.pages[0].blocks.at(-1);
  const withContent = changes
    ? updateWorksheetBlock(next, pageId, block.id, changes)
    : next;
  return updateWorksheetBlockLayout(withContent, pageId, block.id, layout);
}

function startFreeform(document, starterId, createId) {
  const pageId = document.pages[0].id;
  let next = setWorksheetPageLayoutMode(document, pageId, "freeform");
  if (starterId === "blank-freeform") return next;
  if (starterId === "visual-labels" || starterId === "decorate") {
    next = addFreeformBlock(
      next,
      pageId,
      "instruction",
      { x: 20, y: 8, width: 60, height: 10, zIndex: 2, locked: false },
      {
        text:
          starterId === "decorate"
            ? "Choose a visual, make it a background, then decorate it."
            : "Choose a visual, make it a background, then add labels.",
        alignment: "center",
      },
      createId
    );
    return next;
  }
  if (starterId === "map") {
    next = addFreeformBlock(
      next,
      pageId,
      "heading",
      { x: 31, y: 40, width: 38, height: 10, zIndex: 3, locked: false },
      { text: "Main Idea", level: 2, alignment: "center" },
      createId
    );
    [
      [10, 18, "Thought"],
      [70, 18, "Feeling"],
      [10, 70, "What Helps"],
      [70, 70, "Next Step"],
    ].forEach(([x, y, text]) => {
      next = addFreeformBlock(
        next,
        pageId,
        "paragraph",
        { x, y, width: 20, height: 8, zIndex: 3, locked: false },
        { text, alignment: "center" },
        createId
      );
    });
    return next;
  }
  if (starterId === "reflection-visual") {
    next = addFreeformBlock(
      next,
      pageId,
      "instruction",
      { x: 20, y: 8, width: 60, height: 8, zIndex: 2, locked: false },
      {
        text: "Choose a visual, make it a background, then reflect.",
        alignment: "center",
      },
      createId
    );
    return addFreeformBlock(
      next,
      pageId,
      "reflection",
      { x: 16, y: 65, width: 68, height: 24, zIndex: 4, locked: false },
      { title: "What do you notice?", instruction: "", lineCount: 3 },
      createId
    );
  }
  return next;
}

export function applyWorksheetStarter(document, starterId, createId) {
  const pageId = document.pages[0].id;
  if (
    ["blank-freeform", "visual-labels", "decorate", "map", "reflection-visual"].includes(
      starterId
    )
  )
    return startFreeform(document, starterId, createId);
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
