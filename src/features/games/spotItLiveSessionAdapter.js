import { z } from "zod";

import { createLiveSessionAdapter } from "../live-sessions/liveSessionAdapter";
import { applySpotItAction, matchingSymbol, visibleCards } from "./spotItGame";

const cardSchema = z.array(z.string().min(1)).length(8);
const feedbackSchema = z
  .object({
    player: z.enum(["host", "participant"]),
    symbolId: z.string().min(1),
    type: z.enum(["match", "incorrect"]),
  })
  .strict();

export const spotItSharedStateSchema = z
  .object({
    complete: z.boolean(),
    currentIndex: z.number().int().min(0).max(56),
    deck: z.array(cardSchema).length(57),
    feedback: feedbackSchema.nullable(),
    score: z.number().int().nonnegative(),
    symbolIds: z.array(z.string().min(1)).length(57),
    theme: z.string().min(1),
    version: z.literal(2),
  })
  .strict()
  .superRefine((state, context) => {
    if (new Set(state.symbolIds).size !== 57) {
      context.addIssue({ code: "custom", message: "Spot It needs 57 unique symbols." });
      return;
    }
    if (
      state.deck.some(
        (card) =>
          new Set(card).size !== 8 || !card.every((id) => state.symbolIds.includes(id))
      )
    )
      context.addIssue({
        code: "custom",
        message: "Each card must have eight game symbols.",
      });
    if (!state.complete) {
      const [left, right] = visibleCards(state);
      if (!left || !right || left.filter((id) => right.includes(id)).length !== 1)
        context.addIssue({
          code: "custom",
          message: "Visible cards must share exactly one symbol.",
        });
    }
  });

const foundAction = z
  .object({
    type: z.literal("spot-it/found"),
    player: z.enum(["host", "participant"]),
    symbolId: z.string().min(1),
  })
  .strict();
const incorrectAction = z
  .object({
    type: z.literal("spot-it/incorrect"),
    player: z.enum(["host", "participant"]),
    symbolId: z.string().min(1),
  })
  .strict();
const hostAction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("spot-it/advance") }).strict(),
  z.object({ type: z.literal("spot-it/clear-feedback") }).strict(),
  z
    .object({ type: z.literal("spot-it/replace"), state: spotItSharedStateSchema })
    .strict(),
]);
const actionSchema = z.union([foundAction, incorrectAction, hostAction]);

export const spotItLiveSessionAdapter = createLiveSessionAdapter({
  activityKind: "spot-it",
  applyAction: applySpotItAction,
  createAction: (previous, next) => {
    if (!previous.feedback && next.feedback?.type === "match")
      return {
        type: "spot-it/found",
        player: next.feedback.player,
        symbolId: next.feedback.symbolId,
      };
    if (!previous.feedback && next.feedback?.type === "incorrect")
      return {
        type: "spot-it/incorrect",
        player: next.feedback.player,
        symbolId: next.feedback.symbolId,
      };
    return { type: "spot-it/replace", state: next };
  },
  getInitialSharedState: (state) => spotItSharedStateSchema.parse(state),
  isMeaningfulUseAction: (action) => action.type === "spot-it/found",
  isRebasableAction: (_role, action) =>
    action.type === "spot-it/found" || action.type === "spot-it/incorrect",
  validateAction: (role, action, state) => {
    const parsed = actionSchema.safeParse(action);
    if (!parsed.success || !["host", "participant"].includes(role))
      return { success: false };
    if (
      ["spot-it/replace", "spot-it/advance", "spot-it/clear-feedback"].includes(
        parsed.data.type
      )
    )
      return role === "host" ? parsed : { success: false };
    if (parsed.data.player !== role || state.complete || state.feedback)
      return { success: false };
    const visible = visibleCards(state).flat();
    if (!visible.includes(parsed.data.symbolId)) return { success: false };
    const isMatch = parsed.data.symbolId === matchingSymbol(state);
    return parsed.data.type === "spot-it/found"
      ? isMatch
        ? parsed
        : { success: false }
      : !isMatch
        ? parsed
        : { success: false };
  },
  validateSnapshot: (state) => spotItSharedStateSchema.safeParse(state),
});
