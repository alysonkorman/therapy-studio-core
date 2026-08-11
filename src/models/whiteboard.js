import { z } from "zod";

const pointSchema = z.object({ x: z.number().finite(), y: z.number().finite() }).strict();
const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const whiteboardStrokeSchema = z
  .object({
    id: z.string().min(1),
    kind: z.literal("stroke"),
    points: z.array(pointSchema).min(2),
    color: colorSchema,
    width: z.number().min(1).max(40),
  })
  .strict();

export const whiteboardTextSchema = z
  .object({
    id: z.string().min(1),
    kind: z.literal("text"),
    text: z.string().max(500),
    x: z.number().finite(),
    y: z.number().finite(),
    color: colorSchema,
    size: z.number().min(12).max(96),
  })
  .strict();

export const whiteboardVisualSchema = z
  .object({
    id: z.string().min(1),
    kind: z.literal("visual"),
    iconId: z.string().min(1),
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().min(32).max(600),
    height: z.number().min(32).max(600),
  })
  .strict();

export const whiteboardObjectSchema = z.discriminatedUnion("kind", [
  whiteboardStrokeSchema,
  whiteboardTextSchema,
  whiteboardVisualSchema,
]);

export const whiteboardDocumentSchema = z
  .object({
    id: z.string().min(1),
    documentVersion: z.literal(1),
    title: z.string().trim().min(1).max(120),
    objects: z.array(whiteboardObjectSchema),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export function createBlankWhiteboardDocument({
  id,
  now,
  title = "Untitled Whiteboard",
}) {
  return whiteboardDocumentSchema.parse({
    id,
    documentVersion: 1,
    title,
    objects: [],
    createdAt: now,
    updatedAt: now,
  });
}
