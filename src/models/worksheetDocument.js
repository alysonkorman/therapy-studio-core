import { nanoid } from "nanoid";
import { z } from "zod";

const plainText = z
  .string()
  .refine((value) => !/<\/?[a-z][^>]*>/i.test(value), "HTML is not allowed");
const requiredText = plainText.trim().min(1);
const blockBase = {
  id: z.string().min(1),
  sortOrder: z.number().int().nonnegative(),
  layout: z
    .object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
      width: z.number().min(4).max(100),
      height: z.number().min(2).max(100),
      zIndex: z.number().int().min(0).max(999).default(0),
      locked: z.boolean().default(false),
    })
    .optional(),
};

export const worksheetSessionResponseSchema = z
  .object({
    text: plainText.optional(),
    selected: z.array(z.number().int().nonnegative()).optional(),
    rating: z.number().int().min(0).max(10).nullable().optional(),
    otherText: plainText.optional(),
    fields: z.record(z.string(), plainText).optional(),
    cells: z.array(z.array(plainText)).optional(),
  })
  .strict();

export const worksheetSessionResponsesSchema = z.record(
  z.string().min(1),
  worksheetSessionResponseSchema
);

export const worksheetBlockSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...blockBase,
      type: z.literal("heading"),
      text: requiredText,
      level: z.number().int().min(1).max(3).default(2),
      alignment: z.enum(["left", "center", "right"]).default("left"),
    })
    .strict(),
  ...["instruction", "paragraph"].map((type) =>
    z
      .object({
        ...blockBase,
        type: z.literal(type),
        text: requiredText,
        alignment: z.enum(["left", "center", "right"]).default("left"),
      })
      .strict()
  ),
  ...["short-response", "long-response"].map((type) =>
    z
      .object({
        ...blockBase,
        type: z.literal(type),
        prompt: requiredText,
        placeholder: plainText.default(""),
        lineCount: z
          .number()
          .int()
          .min(1)
          .max(12)
          .default(type === "short-response" ? 1 : 5),
      })
      .strict()
  ),
  z
    .object({
      ...blockBase,
      type: z.literal("checklist"),
      prompt: requiredText,
      items: z.array(requiredText).min(1),
      allowOther: z.boolean().default(false),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("multiple-choice"),
      prompt: requiredText,
      options: z.array(requiredText).min(2),
      selectionMode: z.enum(["single", "multiple"]).default("single"),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("rating-scale"),
      prompt: requiredText,
      minimum: z.number().int().min(0).max(9).default(1),
      maximum: z.number().int().min(1).max(10).default(5),
      minimumLabel: plainText.default("Not at all"),
      maximumLabel: plainText.default("Very much"),
      showNumbers: z.boolean().default(true),
    })
    .strict()
    .refine((block) => block.minimum < block.maximum, {
      message: "Scale maximum must be greater than minimum",
    }),
  z
    .object({
      ...blockBase,
      type: z.literal("feelings-scale"),
      prompt: requiredText,
      options: z.array(requiredText).min(2),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("drawing-area"),
      prompt: requiredText,
      height: z.enum(["small", "medium", "large", "xl"]).default("medium"),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("visual"),
      iconId: z.string().trim().min(1).nullable().default(null),
      label: plainText.default(""),
      decorative: z.boolean().default(true),
      size: z.enum(["small", "medium", "large", "xl"]).default("medium"),
      alignment: z.enum(["left", "center", "right"]).default("center"),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("reflection"),
      title: requiredText,
      instruction: plainText.default(""),
      lineCount: z.number().int().min(2).max(12).default(5),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("basic-table"),
      headers: z.array(requiredText).min(2).max(4),
      rows: z.array(z.array(plainText).min(2).max(4)).min(1).max(12),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("sentence-completion"),
      textBefore: requiredText,
      textAfter: plainText.default(""),
      blankSize: z.enum(["short", "medium", "long"]).default("medium"),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("cbt-thought-check"),
      labels: z
        .object({
          situation: requiredText.default("Situation"),
          thought: requiredText.default("Thought"),
          feeling: requiredText.default("Feeling"),
          evidenceFor: requiredText.default("Evidence For"),
          evidenceAgainst: requiredText.default("Evidence Against"),
          balancedThought: requiredText.default("More Balanced Thought"),
        })
        .strict(),
      lineCount: z.number().int().min(1).max(6).default(2),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("coping-plan"),
      triggerPrompt: requiredText,
      choicesPrompt: requiredText,
      choices: z.array(requiredText).min(1).max(12),
      tryPrompt: requiredText,
      helpedPrompt: requiredText,
      lineCount: z.number().int().min(1).max(6).default(2),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("line"),
      strokeColor: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .default("#6C46C3"),
      strokeWidth: z.number().min(1).max(12).default(3),
      arrowhead: z.boolean().default(false),
      label: plainText.default(""),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("divider"),
      style: z.enum(["solid", "dashed", "dotted"]).default("solid"),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("spacer"),
      size: z.enum(["small", "medium", "large", "xl"]).default("medium"),
    })
    .strict(),
]);

export const worksheetPageSettingsSchema = z
  .object({
    paperSize: z.enum(["letter", "a4"]).default("letter"),
    orientation: z.enum(["portrait", "landscape"]).default("portrait"),
    margin: z.enum(["narrow", "normal", "wide"]).default("normal"),
  })
  .strict();

export const worksheetPageSchema = z
  .object({
    id: z.string().min(1),
    title: plainText.default(""),
    sortOrder: z.number().int().nonnegative(),
    settings: worksheetPageSettingsSchema,
    layoutMode: z.enum(["flow", "freeform"]).default("flow"),
    blocks: z.array(worksheetBlockSchema),
  })
  .strict();

export const worksheetDocumentSchema = z
  .object({
    documentVersion: z.literal(1),
    worksheetId: z.string().min(1),
    pages: z.array(worksheetPageSchema).min(1),
    sessionResponses: worksheetSessionResponsesSchema.optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((document, context) => {
    const pageIds = new Set();
    const blockIds = new Set();
    document.pages.forEach((page, pageIndex) => {
      if (pageIds.has(page.id))
        context.addIssue({
          code: "custom",
          message: "Duplicate page ID",
          path: ["pages", pageIndex, "id"],
        });
      pageIds.add(page.id);
      page.blocks.forEach((block, blockIndex) => {
        if (blockIds.has(block.id))
          context.addIssue({
            code: "custom",
            message: "Duplicate block ID",
            path: ["pages", pageIndex, "blocks", blockIndex, "id"],
          });
        blockIds.add(block.id);
        if (
          block.type === "basic-table" &&
          block.rows.some((row) => row.length !== block.headers.length)
        ) {
          context.addIssue({
            code: "custom",
            message: "Every table row must match the number of column headers",
            path: ["pages", pageIndex, "blocks", blockIndex, "rows"],
          });
        }
      });
    });
    Object.keys(document.sessionResponses ?? {}).forEach((blockId) => {
      if (!blockIds.has(blockId)) {
        context.addIssue({
          code: "custom",
          message: "Worksheet response references an unknown block",
          path: ["sessionResponses", blockId],
        });
      }
    });
  });

export function createBlankWorksheetDocument(
  worksheetId,
  { createId = () => nanoid(), now = new Date().toISOString() } = {}
) {
  return worksheetDocumentSchema.parse({
    documentVersion: 1,
    worksheetId,
    pages: [{ id: createId(), title: "Page 1", sortOrder: 0, settings: {}, blocks: [] }],
    createdAt: now,
    updatedAt: now,
  });
}
