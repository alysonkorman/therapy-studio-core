import { z } from "zod";

const conciseText = z.string().trim().min(1);

export const interventionGuidanceSchema = z
  .object({
    resourceId: conciseText,
    overview: conciseText,
    whenToUse: z.array(conciseText).default([]),
    introduction: conciseText,
    steps: z.array(conciseText).min(1),
    therapistPrompts: z.array(conciseText).default([]),
    processingQuestions: z.array(conciseText).default([]),
    adaptations: z.array(conciseText).default([]),
    cautions: z.array(conciseText).default([]),
    sourceStatus: conciseText,
  })
  .strict();
