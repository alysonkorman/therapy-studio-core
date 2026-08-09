import { describe, expect, it } from "vitest";

import { interventionGuidanceSchema } from "./intervention";

const validGuidance = {
  resourceId: "intervention-example",
  overview: "A short, usable overview.",
  introduction: "Invite the child to try the activity.",
  steps: ["Start with one small step."],
  sourceStatus: "Therapy Studio original",
};

describe("interventionGuidanceSchema", () => {
  it("applies safe optional-list defaults", () => {
    expect(interventionGuidanceSchema.parse(validGuidance)).toMatchObject({
      adaptations: [],
      cautions: [],
      processingQuestions: [],
      therapistPrompts: [],
      whenToUse: [],
    });
  });

  it("requires usable steps and rejects unknown fields", () => {
    expect(() =>
      interventionGuidanceSchema.parse({ ...validGuidance, steps: [] })
    ).toThrow();
    expect(() =>
      interventionGuidanceSchema.parse({ ...validGuidance, evidenceLevel: "proven" })
    ).toThrow();
  });
});
