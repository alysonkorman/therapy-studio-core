import { describe, expect, it } from "vitest";

import { scoreSessionContext } from "./scoreSessionContext";

const resource = {
  ageRanges: ["9–12"],
  diagnoses: ["Anxiety"],
  goals: ["Rapport"],
  tags: ["Pokémon"],
  kidsWhoLike: [],
  worksWellWhen: ["They're shutting down"],
  telehealthFriendly: true,
  durationMinutes: 15,
  materials: ["Paper"],
};

const matchingContext = {
  ageRange: "8–10",
  diagnoses: "anxiety",
  goals: "rapport",
  interests: "Pokémon",
  currentState: "shutting down",
  telehealthSetting: "telehealth",
  sessionLengthMinutes: "30",
  materialsAvailable: "paper, markers",
};

describe("scoreSessionContext", () => {
  it("scores every approved session-context match transparently", () => {
    const result = scoreSessionContext(resource, matchingContext);

    expect(result.score).toBeGreaterThan(0);
    expect(result.matches).toEqual(
      expect.arrayContaining([
        "Matches current age range: 9–12",
        "Matches current diagnosis: Anxiety",
        "Matches current goal: Rapport",
        "Matches interest: Pokémon",
        "Matches current state: They're shutting down",
        "Fits telehealth setting",
        "Fits 30-minute session",
        "Uses available material: Paper",
      ])
    );
  });

  it("returns no boost without matching context", () => {
    expect(scoreSessionContext(resource, {})).toEqual({ score: 0, matches: [] });
  });

  it("is deterministic and does not mutate source data", () => {
    const resourceSnapshot = structuredClone(resource);
    const contextSnapshot = structuredClone(matchingContext);
    expect(scoreSessionContext(resource, matchingContext)).toEqual(
      scoreSessionContext(resource, matchingContext)
    );
    expect(resource).toEqual(resourceSnapshot);
    expect(matchingContext).toEqual(contextSnapshot);
  });
});
