import { z } from "zod";

import { promptColorSchema } from "./prompt";

export function promptCategoryIdForName(name) {
  return `prompt-category-${encodeURIComponent(name.trim())}`;
}

const lifecycleFields = {
  id: z.string().min(1),
  archived: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
};

export const promptCategorySchema = z
  .object({
    ...lifecycleFields,
    name: z.string().trim().min(1),
    color: promptColorSchema,
    iconId: z.string().min(1),
    taxonomyGeneration: z.string().datetime().optional(),
  })
  .strict();

export const playlistItemSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(["prompt-deck", "prompt-item"]),
    deckId: z.string().min(1),
    promptId: z.string().min(1).optional(),
    sortOrder: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((item, context) => {
    if (item.type === "prompt-item" && !item.promptId) {
      context.addIssue({
        code: "custom",
        message: "Prompt playlist items require a prompt ID",
        path: ["promptId"],
      });
    }
    if (item.type === "prompt-deck" && item.promptId) {
      context.addIssue({
        code: "custom",
        message: "Deck playlist items cannot include a prompt ID",
        path: ["promptId"],
      });
    }
  });

export const promptPlaylistSchema = z
  .object({
    ...lifecycleFields,
    title: z.string().trim().min(1),
    description: z.string().default(""),
    items: z.array(playlistItemSchema).default([]),
  })
  .strict();
