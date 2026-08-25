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
  { id: "two-sides", label: "Two Sides" },
  { id: "comparison-grid", label: "Comparison Grid" },
  { id: "problem-scale", label: "Problem Scale" },
  { id: "three-columns", label: "Three Columns" },
  { id: "idea-bank", label: "Idea Bank" },
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
  if (starterId === "two-sides") {
    next = addFreeformBlock(
      next,
      pageId,
      "heading",
      { x: 20, y: 7, width: 60, height: 8, zIndex: 2, locked: false },
      { text: "Two Sides", level: 1, alignment: "center" },
      createId
    );
    [
      [7, "First Side"],
      [53, "Second Side"],
    ].forEach(([x, title]) => {
      next = addFreeformBlock(
        next,
        pageId,
        "reflection",
        { x, y: 23, width: 40, height: 60, zIndex: 3, locked: false },
        { title, instruction: "", lineCount: 8 },
        createId
      );
    });
    return next;
  }
  if (starterId === "comparison-grid") {
    next = addFreeformBlock(
      next,
      pageId,
      "heading",
      { x: 16, y: 7, width: 68, height: 8, zIndex: 2, locked: false },
      { text: "Comparison Grid", level: 1, alignment: "center" },
      createId
    );
    return addFreeformBlock(
      next,
      pageId,
      "basic-table",
      { x: 7, y: 23, width: 86, height: 58, zIndex: 3, locked: false },
      {
        headers: ["First", "Second", "What I Notice"],
        rows: Array.from({ length: 4 }, () => ["", "", ""]),
      },
      createId
    );
  }
  if (starterId === "problem-scale") {
    next = addFreeformBlock(
      next,
      pageId,
      "heading",
      { x: 20, y: 7, width: 60, height: 8, zIndex: 2, locked: false },
      { text: "Problem Scale", level: 1, alignment: "center" },
      createId
    );
    ["Small", "Medium", "Big", "Very Big", "Emergency"].forEach((label, index) => {
      next = addFreeformBlock(
        next,
        pageId,
        "short-response",
        {
          x: 12 + index * 7,
          y: 23 + (4 - index) * 12,
          width: 62 + index * 5,
          height: 8,
          zIndex: 3,
          locked: false,
        },
        { prompt: label, placeholder: "", lineCount: 1 },
        createId
      );
    });
    return next;
  }
  if (starterId === "three-columns") {
    next = addFreeformBlock(
      next,
      pageId,
      "heading",
      { x: 16, y: 7, width: 68, height: 8, zIndex: 2, locked: false },
      { text: "Three Columns", level: 1, alignment: "center" },
      createId
    );
    return addFreeformBlock(
      next,
      pageId,
      "basic-table",
      { x: 7, y: 23, width: 86, height: 58, zIndex: 3, locked: false },
      {
        headers: ["First", "Next", "Then"],
        rows: Array.from({ length: 4 }, () => ["", "", ""]),
      },
      createId
    );
  }
  if (starterId === "idea-bank") {
    next = addFreeformBlock(
      next,
      pageId,
      "heading",
      { x: 20, y: 7, width: 60, height: 8, zIndex: 2, locked: false },
      { text: "Idea Bank", level: 1, alignment: "center" },
      createId
    );
    [
      [7, 24, "Idea 1"],
      [53, 24, "Idea 2"],
      [7, 57, "Idea 3"],
      [53, 57, "Idea 4"],
    ].forEach(([x, y, title]) => {
      next = addFreeformBlock(
        next,
        pageId,
        "reflection",
        { x, y, width: 40, height: 23, zIndex: 3, locked: false },
        { title, instruction: "", lineCount: 2 },
        createId
      );
    });
    return next;
  }
  return next;
}

export function applyWorksheetStarter(document, starterId, createId) {
  const pageId = document.pages[0].id;
  if (
    [
      "blank-freeform",
      "visual-labels",
      "decorate",
      "map",
      "reflection-visual",
      "two-sides",
      "comparison-grid",
      "problem-scale",
      "three-columns",
      "idea-bank",
    ].includes(starterId)
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
