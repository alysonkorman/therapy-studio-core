import { nanoid } from "nanoid";

import { createWorksheetResource, worksheetDocumentSchema } from "../../models";
import {
  WORKSHEET_IMPORT_FORMAT,
  WORKSHEET_IMPORT_VERSION,
  validateWorksheetImport,
} from "./importWorksheets";

const notices = [
  /private use only[^\n]*/gi,
  /do not redistribute[^\n]*/gi,
  /copyright[^\n]*/gi,
  /review required[^\n]*/gi,
];

const clean = (value) => String(value ?? "").trim();
const stripMarker = (value) =>
  clean(value).replace(/^\s*(?:[-*•☐☑]|\[[ x]\]|\d+[.)]|[A-F][.)])\s*/i, "");

function block(type, input) {
  return { id: nanoid(), sortOrder: 0, type, ...input };
}

function responseBlock(prompt, blankLines) {
  const long = blankLines >= 2;
  return block(long ? "long-response" : "short-response", {
    prompt,
    placeholder: "",
    lineCount: long ? Math.min(blankLines + 2, 12) : 1,
  });
}

function isHeading(line) {
  return (
    /^#{1,3}\s+/.test(line) ||
    (/^[A-Z][A-Z\s/&-]{2,40}$/.test(line) && !line.endsWith("?"))
  );
}

function contiguousMatching(lines, pattern, limit) {
  const matches = [];
  for (const line of lines.slice(0, limit)) {
    if (!pattern.test(line)) break;
    matches.push(line);
  }
  return matches;
}

function parsePage(text, pageIndex, tableRows = []) {
  const lines = text.split("\n");
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    const line = clean(lines[index]);
    if (!line) {
      index += 1;
      continue;
    }

    const nextLines = lines.slice(index + 1);
    const optionLines = contiguousMatching(nextLines, /^\s*(?:[A-F][.)]|[-*•])\s+\S/i, 6);
    if (line.endsWith("?") && optionLines.length >= 2) {
      blocks.push(
        block("multiple-choice", {
          prompt: line,
          options: optionLines.map(stripMarker),
          selectionMode: "single",
        })
      );
      index += optionLines.length + 1;
      continue;
    }

    const scale = line.match(/(.+?)(?:\s+|:)(0|1)\s*(?:-|to|→)\s*(5|10)(?:\s+(.+?))?$/i);
    if (scale) {
      blocks.push(
        block("rating-scale", {
          prompt: clean(scale[1]),
          minimum: Number(scale[2]),
          maximum: Number(scale[3]),
          minimumLabel: "",
          maximumLabel: clean(scale[4]),
          showNumbers: true,
        })
      );
      index += 1;
      continue;
    }

    if (/_{3,}/.test(line)) {
      const [before, ...after] = line.split(/_{3,}/);
      blocks.push(
        block("sentence-completion", {
          textBefore: clean(before),
          textAfter: clean(after.join(" ")),
          blankSize: "medium",
        })
      );
      index += 1;
      continue;
    }

    if (/^(?:reflection|reflect)\s*:?$/i.test(line)) {
      const prompt = clean(lines[index + 1]);
      blocks.push(
        block("reflection", {
          title: prompt || "Reflection",
          instruction: "",
          lineCount: 5,
        })
      );
      index += prompt ? 2 : 1;
      continue;
    }

    const checklistPattern = /^\s*(?:☐|\[[ x]\]|[-*•])\s+\S/i;
    const lineIsItem = checklistPattern.test(line);
    const checklistLines = contiguousMatching(
      lineIsItem ? [line, ...nextLines] : nextLines,
      checklistPattern,
      12
    );
    if (checklistLines.length >= 2) {
      blocks.push(
        block("checklist", {
          prompt: lineIsItem ? "Choose" : line.replace(/:$/, ""),
          items: checklistLines.map(stripMarker),
          allowOther: false,
        })
      );
      index += checklistLines.length + (lineIsItem ? 0 : 1);
      continue;
    }

    const blankLines = nextLines.findIndex((item) => clean(item)) + 1;
    if (
      line.endsWith("?") &&
      (blankLines === 0 || /^_{3,}$/.test(clean(lines[index + 1])))
    ) {
      let responseLines = 0;
      while (/^_{3,}$/.test(clean(lines[index + 1 + responseLines]))) responseLines += 1;
      blocks.push(responseBlock(line, responseLines));
      index += responseLines + 1;
      continue;
    }

    if (/^(?:instructions?|directions?)\s*:/i.test(line)) {
      const inlineText = clean(line.replace(/^[^:]+:/, ""));
      const followingText = clean(lines[index + 1]);
      blocks.push(
        block("instruction", {
          text: inlineText || followingText || "Review the instructions.",
          alignment: "left",
        })
      );
      index += inlineText || !followingText ? 1 : 2;
      continue;
    }

    if (isHeading(line)) {
      blocks.push(
        block("heading", {
          text: line.replace(/^#{1,3}\s+/, ""),
          level: pageIndex === 0 && blocks.length === 0 ? 1 : 2,
          alignment: "left",
        })
      );
      index += 1;
      continue;
    }

    blocks.push(block("paragraph", { text: line, alignment: "left" }));
    index += 1;
  }

  for (const rows of tableRows) {
    if (rows.length >= 2 && rows[0].length >= 2 && rows[0].length <= 4) {
      const width = rows[0].length;
      const validRows = rows.slice(1, 13).filter((row) => row.length === width);
      if (validRows.length) {
        blocks.push(block("basic-table", { headers: rows[0], rows: validRows }));
      }
    }
  }
  return blocks.map((item, sortOrder) => ({ ...item, sortOrder }));
}

function specializedBlocks(text) {
  const normalized = text.toLocaleLowerCase();
  const cbtLabels = [
    "situation",
    "thought",
    "feeling",
    "evidence for",
    "evidence against",
    "balanced thought",
  ];
  if (cbtLabels.every((label) => normalized.includes(label))) {
    return [
      block("cbt-thought-check", {
        labels: {
          situation: "Situation",
          thought: "Thought",
          feeling: "Feeling",
          evidenceFor: "Evidence For",
          evidenceAgainst: "Evidence Against",
          balancedThought: "More Balanced Thought",
        },
        lineCount: 2,
      }),
    ];
  }
  const copingLabels = ["trigger", "coping choices", "what i will try", "what helped"];
  if (copingLabels.every((label) => normalized.includes(label))) {
    return [
      block("coping-plan", {
        triggerPrompt: "Trigger or Situation",
        choicesPrompt: "Coping Choices",
        choices: ["Add a coping choice"],
        tryPrompt: "What I Will Try",
        helpedPrompt: "What Helped",
        lineCount: 2,
      }),
    ];
  }
  return [];
}

export function convertWorksheetText(text, { tables = [], warnings = [] } = {}) {
  const normalized = clean(text.replace(/\r\n?/g, "\n"));
  if (!normalized) throw new Error("No readable Worksheet text was found.");
  const sourceWarnings = [
    ...new Set(notices.flatMap((pattern) => normalized.match(pattern) ?? [])),
  ];
  const rawPages = normalized.split("\f").filter((page) => page.trim());
  const firstLine = clean(rawPages[0]?.split("\n").find((line) => clean(line)));
  const titleMatch = normalized.match(/^title\s*:\s*(.+)$/im);
  const title = clean(titleMatch?.[1] ?? firstLine.replace(/^#{1,3}\s+/, ""));
  const attribution = clean(
    normalized.match(/^(?:source|author|attribution)\s*:\s*(.+)$/im)?.[1]
  );
  const pages = rawPages.map((page, pageIndex) => {
    let blocks = parsePage(
      page
        .replace(/^title\s*:.+$/im, "")
        .replace(/^(?:source|author|attribution)\s*:.+$/gim, ""),
      pageIndex,
      tables.filter((table) => table.pageIndex === pageIndex).map((table) => table.rows)
    );
    const special = specializedBlocks(page);
    if (special.length) {
      blocks = blocks.filter(
        (item) =>
          item.type === "heading" ||
          !/^(situation|thought|feeling|evidence|more balanced|trigger|coping choices|what i)/i.test(
            item.text ?? ""
          )
      );
      blocks.push(...special);
      blocks = blocks.map((item, sortOrder) => ({ ...item, sortOrder }));
    }
    return { title: `Page ${pageIndex + 1}`, blocks };
  });
  if (!pages.some((page) => page.blocks.length)) {
    throw new Error("Conversion did not produce any meaningful Worksheet blocks.");
  }
  return {
    title,
    pages,
    warnings: [...warnings, ...sourceWarnings],
    source: attribution,
    attribution,
  };
}

export function createWorksheetPairFromConversion(
  review,
  { id = nanoid(), createId = () => nanoid(), now = new Date().toISOString() } = {}
) {
  const resource = createWorksheetResource(
    {
      title: clean(review.title),
      description: clean(review.description),
      source: clean(review.source),
      attribution: clean(review.attribution),
      provenance: "original",
    },
    { id, now }
  );
  const document = worksheetDocumentSchema.parse({
    documentVersion: 1,
    worksheetId: id,
    pages: review.pages.map((page, pageIndex) => ({
      id: createId(),
      title: clean(page.title) || `Page ${pageIndex + 1}`,
      sortOrder: pageIndex,
      settings: {},
      blocks: page.blocks.map((item, sortOrder) => ({
        ...item,
        id: createId(),
        sortOrder,
      })),
    })),
    createdAt: now,
    updatedAt: now,
  });
  return validateWorksheetImport({
    format: WORKSHEET_IMPORT_FORMAT,
    version: WORKSHEET_IMPORT_VERSION,
    worksheets: [{ resource, document }],
  }).worksheets[0];
}
