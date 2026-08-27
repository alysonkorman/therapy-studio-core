import { z } from "zod";

import {
  advanceMemoryAfterMatch,
  advanceMemoryAfterMismatch,
  applyMemoryAction,
  canFlipMemoryCard,
} from "./memoryGame";
import { createLiveSessionAdapter } from "../live-sessions/liveSessionAdapter";

const playerSchema = z.enum(["host", "participant"]);
const cardSchema = z.object({ id: z.string().min(1), image: z.string().min(1) }).strict();
const feedbackSchema = z
  .object({
    type: z.enum(["match", "mismatch"]),
    cards: z.array(z.number().int().min(0).max(49)).length(2),
    player: playerSchema.optional(),
  })
  .strict();

export const memorySharedStateSchema = z
  .object({
    version: z.literal(2),
    activePlayer: playerSchema,
    cards: z.array(cardSchema).min(12).max(50),
    difficulty: z.enum(["easy", "medium", "hard", "challenge", "expert"]),
    feedback: feedbackSchema.nullable(),
    flipped: z.array(z.number().int().min(0).max(49)).max(2),
    matched: z.array(z.number().int().min(0).max(49)),
    scores: z
      .object({
        host: z.number().int().nonnegative(),
        participant: z.number().int().nonnegative(),
      })
      .strict(),
    startingPlayer: playerSchema,
    theme: z.string().min(1),
  })
  .strict()
  .superRefine((state, context) => {
    if (state.cards.length % 2)
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Cards must be pairs." });
    if (
      new Set(state.flipped).size !== state.flipped.length ||
      new Set(state.matched).size !== state.matched.length
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Card indexes must be unique.",
      });
    if (state.flipped.some((index) => state.matched.includes(index)))
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A removed card cannot be flipped.",
      });
  });

const actionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("memory/flip"),
      index: z.number().int().min(0).max(49),
      player: playerSchema,
      shared: z.boolean(),
    })
    .strict(),
  z.object({ type: z.literal("memory/advance-match") }).strict(),
  z.object({ type: z.literal("memory/advance-mismatch") }).strict(),
  z
    .object({ type: z.literal("memory/replace"), state: memorySharedStateSchema })
    .strict(),
]);

export const memoryLiveSessionAdapter = createLiveSessionAdapter({
  activityKind: "memory",
  applyAction(state, action) {
    if (action.type === "memory/advance-match") return advanceMemoryAfterMatch(state);
    if (action.type === "memory/advance-mismatch")
      return advanceMemoryAfterMismatch(state);
    return applyMemoryAction(state, action);
  },
  createAction: (_previous, next) => ({ type: "memory/replace", state: next }),
  getInitialSharedState: (state) => memorySharedStateSchema.parse(state),
  isMeaningfulUseAction: (action) => action.type === "memory/flip",
  isRebasableAction: (_role, action) => action.type === "memory/flip",
  validateAction(role, action, state) {
    if (!playerSchema.safeParse(role).success) return { success: false };
    const parsed = actionSchema.safeParse(action);
    if (!parsed.success) return parsed;
    if (
      parsed.data.type === "memory/replace" ||
      parsed.data.type.startsWith("memory/advance")
    )
      return role === "host" ? parsed : { success: false };
    if (parsed.data.player !== role || !canFlipMemoryCard(state, parsed.data))
      return { success: false };
    return parsed;
  },
  validateSnapshot: (state) => memorySharedStateSchema.safeParse(state),
});
