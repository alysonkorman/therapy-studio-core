import { describe, expect, it } from "vitest";

import {
  convertInterventionText,
  createInterventionPairFromReview,
} from "./convertInterventionDocument";

const structuredText = `
Title: Five Senses Grounding
Overview: A brief grounding activity.
Goals: Regulation; Mindfulness
Ages: Teen, Adult
Duration: 10 minutes
Telehealth: Yes
Materials:
- Paper
- Pen
Introduction: Let's slow down and notice what is around us.
Steps:
1. Name five things you can see.
2. Name four things you can feel.
Processing Questions:
- What did you notice?
- What helped most?
Source: Alyson Korman, private use only
`;

describe("convertInterventionText", () => {
  it("maps headings, numbered steps, bullets, and metadata deterministically", () => {
    const first = convertInterventionText(structuredText);
    const second = convertInterventionText(structuredText);

    expect(first).toEqual(second);
    expect(first.proposal).toMatchObject({
      title: "Five Senses Grounding",
      goals: ["Regulation", "Mindfulness"],
      ageRanges: ["Teen", "Adult"],
      durationMinutes: 10,
      telehealthFriendly: true,
      materials: ["Paper", "Pen"],
      steps: ["Name five things you can see.", "Name four things you can feel."],
      processingQuestions: ["What did you notice?", "What helped most?"],
    });
    expect(first.warnings).toContain("private use only");
  });

  it("flags missing required review fields without inventing content", () => {
    const result = convertInterventionText("A useful activity");
    expect(result.proposal.title).toBe("A useful activity");
    expect(result.proposal.steps).toEqual([]);
    expect(result.missing).toEqual([
      "overview",
      "introduction",
      "steps",
      "source/attribution",
    ]);
  });

  it("warns when one source appears to contain multiple interventions", () => {
    const result = convertInterventionText(
      "Title: First\nTitle: Second\nOverview: Test\nSteps: One"
    );
    expect(result.warnings).toContain(
      "This source appears to contain multiple interventions; split and import each intervention individually."
    );
  });
});

describe("createInterventionPairFromReview", () => {
  it("turns reviewed content into a canonical validated pair", () => {
    const review = convertInterventionText(structuredText).proposal;
    const pair = createInterventionPairFromReview(review, {
      id: "intervention-five-senses",
      now: "2026-08-11T12:00:00.000Z",
    });

    expect(pair.resource.id).toBe("intervention-five-senses");
    expect(pair.guidance.resourceId).toBe(pair.resource.id);
    expect(pair.guidance.steps).toHaveLength(2);
    expect(pair.guidance.sourceStatus).toContain("private use only");
  });

  it("rejects a review that still lacks required Intervention content", () => {
    expect(() =>
      createInterventionPairFromReview(
        {
          title: "Incomplete",
          overview: "",
          introduction: "",
          steps: [],
          sourceStatus: "Review required",
        },
        { id: "incomplete", now: "2026-08-11T12:00:00.000Z" }
      )
    ).toThrow();
  });
});
