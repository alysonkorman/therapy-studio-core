import { nanoid } from "nanoid";
import { z } from "zod";

const plainText = z
  .string()
  .refine((value) => !/<\/?[a-z][^>]*>/i.test(value), "HTML is not allowed");
const requiredText = plainText.trim().min(1);
const blockBase = {
  id: z.string().min(1),
  sortOrder: z.number().int().nonnegative(),
};

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
      height: z.enum(["small", "medium", "large"]).default("medium"),
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
      size: z.enum(["small", "medium", "large"]).default("medium"),
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
    blocks: z.array(worksheetBlockSchema),
  })
  .strict();

export const worksheetDocumentSchema = z
  .object({
    documentVersion: z.literal(1),
    worksheetId: z.string().min(1),
    pages: z.array(worksheetPageSchema).min(1),
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
      });
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
