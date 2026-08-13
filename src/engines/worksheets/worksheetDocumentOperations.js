import { nanoid } from "nanoid";

import { worksheetDocumentSchema } from "../../models/worksheetDocument";

const defaults = {
  heading: { text: "New heading", level: 2, alignment: "left" },
  instruction: { text: "Add instructions here.", alignment: "left" },
  paragraph: { text: "Add text here.", alignment: "left" },
  "short-response": { prompt: "Your response", placeholder: "", lineCount: 1 },
  "long-response": { prompt: "Your response", placeholder: "", lineCount: 5 },
  checklist: { prompt: "Choose what fits", items: ["First option"], allowOther: false },
  "multiple-choice": {
    prompt: "Choose one",
    options: ["Option one", "Option two"],
    selectionMode: "single",
  },
  "rating-scale": {
    prompt: "How much?",
    minimum: 1,
    maximum: 5,
    minimumLabel: "Not at all",
    maximumLabel: "Very much",
    showNumbers: true,
  },
  "feelings-scale": {
    prompt: "How are you feeling?",
    options: ["Calm", "Unsure", "Upset"],
  },
  "drawing-area": { prompt: "Draw here", height: "medium" },
  visual: {
    iconId: null,
    label: "",
    decorative: true,
    size: "medium",
    alignment: "center",
  },
  reflection: {
    title: "What did you notice?",
    instruction: "Take a moment to reflect.",
    lineCount: 5,
  },
  "basic-table": {
    headers: ["What happened?", "What I noticed"],
    rows: [
      ["", ""],
      ["", ""],
    ],
  },
  "sentence-completion": {
    textBefore: "One thing I can try is",
    textAfter: ".",
    blankSize: "medium",
  },
  "cbt-thought-check": {
    labels: {
      situation: "Situation",
      thought: "Thought",
      feeling: "Feeling",
      evidenceFor: "Evidence For",
      evidenceAgainst: "Evidence Against",
      balancedThought: "More Balanced Thought",
    },
    lineCount: 2,
  },
  "coping-plan": {
    triggerPrompt: "When this happens",
    choicesPrompt: "Coping choices",
    choices: ["Take a slow breath", "Ask for help", "Take a break"],
    tryPrompt: "What I will try",
    helpedPrompt: "What helped",
    lineCount: 2,
  },
  line: { strokeColor: "#6C46C3", strokeWidth: 3, arrowhead: true, label: "" },
  divider: { style: "solid" },
  spacer: { size: "medium" },
};

const normalize = (items) => items.map((item, sortOrder) => ({ ...item, sortOrder }));
const parse = (document) => worksheetDocumentSchema.parse(document);

function updatePage(document, pageId, change) {
  let found = false;
  const pages = document.pages.map((page) => {
    if (page.id !== pageId) return page;
    found = true;
    return change(page);
  });
  if (!found) throw new Error(`Worksheet page not found: ${pageId}`);
  return parse({ ...document, pages });
}

const defaultFreeformLayout = (index = 0) => ({
  x: 10 + (index % 3) * 7,
  y: 10 + (index % 3) * 7,
  width: 38,
  height: 18,
  zIndex: index,
  locked: false,
});

export function createWorksheetBlock(type, sortOrder, createId = () => nanoid()) {
  if (!defaults[type]) throw new Error(`Unsupported Worksheet block type: ${type}`);
  return { id: createId(), type, sortOrder, ...structuredClone(defaults[type]) };
}

export function addWorksheetBlock(document, pageId, type, createId) {
  return updatePage(document, pageId, (page) => ({
    ...page,
    blocks: [
      ...page.blocks,
      {
        ...createWorksheetBlock(type, page.blocks.length, createId),
        ...(page.layoutMode === "freeform"
          ? { layout: defaultFreeformLayout(page.blocks.length) }
          : {}),
      },
    ],
  }));
}

export function addFreeformTextAt(document, pageId, point, createId = () => nanoid()) {
  return updatePage(document, pageId, (page) => {
    if (page.layoutMode !== "freeform")
      throw new Error("Text placement requires a freeform page");
    const width = 32;
    const height = 10;
    const x = Math.max(0, Math.min(100 - width, point.x));
    const y = Math.max(0, Math.min(100 - height, point.y));
    return {
      ...page,
      blocks: [
        ...page.blocks,
        {
          ...createWorksheetBlock("paragraph", page.blocks.length, createId),
          text: "Type here",
          layout: { x, y, width, height, zIndex: page.blocks.length + 1, locked: false },
        },
      ],
    };
  });
}

export function updateWorksheetBlockLayout(document, pageId, blockId, changes) {
  return updatePage(document, pageId, (page) => {
    const block = page.blocks.find(({ id }) => id === blockId);
    if (!block) throw new Error(`Worksheet block not found: ${blockId}`);
    const layout = {
      ...defaultFreeformLayout(block.sortOrder),
      ...block.layout,
      ...changes,
    };
    return {
      ...page,
      blocks: page.blocks.map((item) =>
        item.id === blockId ? { ...item, layout } : item
      ),
    };
  });
}

export function setWorksheetBlockLayer(document, pageId, blockId, direction) {
  return updatePage(document, pageId, (page) => {
    const maximum = Math.max(0, ...page.blocks.map((block) => block.layout?.zIndex ?? 0));
    return {
      ...page,
      blocks: page.blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              layout: {
                ...defaultFreeformLayout(block.sortOrder),
                ...block.layout,
                zIndex: direction === "forward" ? maximum + 1 : 0,
              },
            }
          : block
      ),
    };
  });
}

export function setWorksheetVisualBackground(document, pageId, blockId) {
  return updateWorksheetBlockLayout(document, pageId, blockId, {
    x: 4,
    y: 4,
    width: 92,
    height: 92,
    zIndex: 0,
    locked: true,
  });
}

export function updateWorksheetBlock(document, pageId, blockId, changes) {
  return updatePage(document, pageId, (page) => {
    if (!page.blocks.some(({ id }) => id === blockId))
      throw new Error(`Worksheet block not found: ${blockId}`);
    return {
      ...page,
      blocks: page.blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              ...changes,
              id: block.id,
              type: block.type,
              sortOrder: block.sortOrder,
            }
          : block
      ),
    };
  });
}

export function duplicateWorksheetBlock(
  document,
  pageId,
  blockId,
  createId = () => nanoid()
) {
  return updatePage(document, pageId, (page) => {
    const index = page.blocks.findIndex(({ id }) => id === blockId);
    if (index < 0) throw new Error(`Worksheet block not found: ${blockId}`);
    const blocks = [...page.blocks];
    blocks.splice(index + 1, 0, {
      ...structuredClone(page.blocks[index]),
      id: createId(),
    });
    return { ...page, blocks: normalize(blocks) };
  });
}

export function deleteWorksheetBlock(document, pageId, blockId) {
  return updatePage(document, pageId, (page) => ({
    ...page,
    blocks: normalize(page.blocks.filter(({ id }) => id !== blockId)),
  }));
}

export function moveWorksheetBlock(document, pageId, blockId, offset) {
  return updatePage(document, pageId, (page) => {
    const index = page.blocks.findIndex(({ id }) => id === blockId);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= page.blocks.length) return page;
    const blocks = [...page.blocks];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    return { ...page, blocks: normalize(blocks) };
  });
}

export function addWorksheetPage(document, createId = () => nanoid()) {
  return parse({
    ...document,
    pages: [
      ...document.pages,
      {
        id: createId(),
        title: `Page ${document.pages.length + 1}`,
        sortOrder: document.pages.length,
        settings: { paperSize: "letter", orientation: "portrait", margin: "normal" },
        blocks: [],
      },
    ],
  });
}

export function updateWorksheetPage(document, pageId, changes) {
  return updatePage(document, pageId, (page) => ({
    ...page,
    ...changes,
    id: page.id,
    sortOrder: page.sortOrder,
  }));
}

export function setWorksheetPageLayoutMode(document, pageId, layoutMode) {
  return updatePage(document, pageId, (page) => ({
    ...page,
    layoutMode,
    blocks:
      layoutMode === "freeform"
        ? page.blocks.map((block, index) => ({
            ...block,
            layout: block.layout ?? defaultFreeformLayout(index),
          }))
        : page.blocks,
  }));
}

export function duplicateWorksheetPage(document, pageId, createId = () => nanoid()) {
  const index = document.pages.findIndex(({ id }) => id === pageId);
  if (index < 0) throw new Error(`Worksheet page not found: ${pageId}`);
  const source = document.pages[index];
  const copy = {
    ...structuredClone(source),
    id: createId(),
    title: `${source.title || `Page ${index + 1}`} Copy`,
    blocks: source.blocks.map((block) => ({ ...block, id: createId() })),
  };
  const pages = [...document.pages];
  pages.splice(index + 1, 0, copy);
  return parse({ ...document, pages: normalize(pages) });
}

export function deleteWorksheetPage(document, pageId, createId = () => nanoid()) {
  const remaining = document.pages.filter(({ id }) => id !== pageId);
  if (remaining.length) return parse({ ...document, pages: normalize(remaining) });
  return parse({
    ...document,
    pages: [
      {
        id: createId(),
        title: "Page 1",
        sortOrder: 0,
        settings: { paperSize: "letter", orientation: "portrait", margin: "normal" },
        blocks: [],
      },
    ],
  });
}

export function moveWorksheetPage(document, pageId, offset) {
  const index = document.pages.findIndex(({ id }) => id === pageId);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= document.pages.length) return document;
  const pages = [...document.pages];
  [pages[index], pages[target]] = [pages[target], pages[index]];
  return parse({ ...document, pages: normalize(pages) });
}
