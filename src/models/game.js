import { z } from "zod";

import { resourceSchema } from "./resource";

const triviaDifficultySchema = z.enum(["easy", "medium"]);

export const triviaQuestionSchema = z
  .object({
    id: z.string().trim().min(1),
    question: z.string().trim().min(1),
    answer: z.string().trim().min(1),
    choices: z.array(z.string().trim().min(1)).min(2).max(6).optional(),
    explanation: z.string().trim().optional(),
    category: z.string().trim().optional(),
    difficulty: triviaDifficultySchema.optional(),
    sortOrder: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((question, context) => {
    if (question.choices && !question.choices.includes(question.answer)) {
      context.addIssue({
        code: "custom",
        message: "The intended answer must match one of the choices.",
        path: ["answer"],
      });
    }
  });

export const triviaGameSchema = resourceSchema
  .extend({
    type: z.literal("game"),
    gameKind: z.literal("trivia"),
    category: z.string().default(""),
    iconId: z.string().trim().min(1).nullable().default(null),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a six-digit hex value")
      .default("#6C46C3"),
    difficulty: z.enum(["easy", "medium", "mixed"]).default("mixed"),
    contentVersion: z.literal(1),
    pointsEnabled: z.boolean().default(false),
    questions: z.array(triviaQuestionSchema),
  })
  .strict()
  .superRefine((game, context) => {
    const ids = new Set();
    for (const question of game.questions) {
      if (ids.has(question.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate Trivia question ID: ${question.id}`,
          path: ["questions"],
        });
      }
      ids.add(question.id);
    }
  })
  .transform((game) => ({
    ...game,
    questions: [...game.questions].sort(
      (first, second) =>
        first.sortOrder - second.sortOrder || first.id.localeCompare(second.id)
    ),
  }));

export { triviaDifficultySchema };
