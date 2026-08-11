import { describe, expect, it } from "vitest";

import { interventionGuidanceSchema, resourceSchema } from "../../models";
import {
  parseInterventionImportJson,
  validateInterventionImport,
} from "./importInterventions";

const timestamp = "2026-08-11T12:00:00.000Z";

function pair(id = "intervention-imported") {
  return {
    resource: resourceSchema.parse({
      id,
      type: "intervention",
      title: "Imported Grounding",
      source: "Therapist-authored collection",
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
    guidance: interventionGuidanceSchema.parse({
      resourceId: id,
      overview: "A brief grounding activity.",
      introduction: "Let’s notice what is around us.",
      steps: ["Name five things you can see."],
      sourceStatus: "Therapist-authored collection",
    }),
  };
}

function envelope(interventions = [pair()]) {
  return { format: "therapy-studio-interventions", version: 1, interventions };
}

describe("Intervention import validation", () => {
  it("validates single and bulk Resource/guidance pairs", () => {
    const parsed = validateInterventionImport(
      envelope([pair("intervention-one"), pair("intervention-two")])
    );
    expect(parsed.interventions).toHaveLength(2);
    expect(parsed.interventions[0].resource.source).toBe("Therapist-authored collection");
  });

  it.each([
    ["malformed JSON", "{"],
    ["wrong format", JSON.stringify({ ...envelope(), format: "other" })],
    ["wrong version", JSON.stringify({ ...envelope(), version: 2 })],
    ["missing guidance", JSON.stringify(envelope([{ resource: pair().resource }]))],
  ])("rejects %s", (_label, input) => {
    expect(() => parseInterventionImportJson(input)).toThrow(
      /could not read|not a valid/i
    );
  });

  it("rejects mismatched, duplicate, and malformed records", () => {
    expect(() =>
      validateInterventionImport(
        envelope([
          {
            ...pair(),
            guidance: { ...pair().guidance, resourceId: "different" },
          },
        ])
      )
    ).toThrow(/not a valid/i);
    expect(() => validateInterventionImport(envelope([pair(), pair()]))).toThrow(
      /not a valid/i
    );
    expect(() =>
      validateInterventionImport(
        envelope([{ ...pair(), resource: { ...pair().resource, extra: true } }])
      )
    ).toThrow(/not a valid/i);
  });
});
