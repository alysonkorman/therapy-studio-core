import { z } from "zod";

import { whiteboardObjectSchema } from "./whiteboard";

const plainText = z
  .string()
  .max(500)
  .refine((value) => !/<[^>]*>/.test(value), {
    message: "HTML is not allowed",
  });

export const sessionCanvasTemplateSchema = z
  .object({
    id: z.string().min(1),
    templateVersion: z.literal(1),
    title: plainText.trim().min(1).max(120),
    description: plainText.trim().min(1).max(240),
    category: plainText.trim().min(1).max(80),
    goals: z.array(plainText.trim().min(1).max(80)).max(10),
    objects: z.array(whiteboardObjectSchema),
  })
  .strict()
  .superRefine(({ objects }, context) => {
    const ids = new Set();
    objects.forEach(({ id }, index) => {
      if (ids.has(id)) {
        context.addIssue({
          code: "custom",
          message: "Canvas object IDs must be unique",
          path: ["objects", index, "id"],
        });
      }
      ids.add(id);
    });
  });
