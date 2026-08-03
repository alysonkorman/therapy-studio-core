import { describe, expect, it } from "vitest";

import { resourceTypes } from "../../models/resource";
import { searchResources } from "./searchResources";

function makeResource(overrides = {}) {
  return {
    id: "resource-1",
    type: "intervention",
    title: "Feelings Jenga",
    description: "Identify and discuss emotions through play.",
    category: "Activities",
    tags: ["drawing"],
    worksWellWhen: ["They're shutting down"],
    kidsWhoLike: ["Pokémon"],
    goals: ["Emotion identification", "Rapport"],
    diagnoses: ["Anxiety"],
    ageRanges: ["9–12"],
    settings: ["Telehealth"],
    materials: ["Jenga blocks"],
    durationMinutes: 10,
    telehealthFriendly: true,
    source: "Clinical library",
    myNotes: "Invite drawing if talking feels hard.",
    prompts: [],
    ...overrides,
  };
}

describe("searchResources", () => {
  it("supports capitalization, punctuation, apostrophes, and partial words", () => {
    expect(searchResources([makeResource()], "POKÉ")).toHaveLength(1);
    expect(searchResources([makeResource()], "they’re shutting")).toHaveLength(1);
  });

  it("supports multiple tokens without requiring exact word order", () => {
    const [result] = searchResources([makeResource()], "anxiety 9 year old");
    expect(result.resource.id).toBe("resource-1");
    expect(result.matches).toContain("Matched goal or diagnosis: Anxiety");
  });

  it("ranks exact titles above title tokens and weaker metadata", () => {
    const exact = makeResource({ id: "exact", title: "Rapport" });
    const titleToken = makeResource({ id: "title", title: "Rapport Builder" });
    const metadata = makeResource({
      id: "metadata",
      title: "Connection",
      goals: ["Rapport"],
    });

    expect(
      searchResources([metadata, titleToken, exact], "rapport").map(
        ({ resource }) => resource.id
      )
    ).toEqual(["exact", "title", "metadata"]);
  });

  it("boosts exact phrases and resources matching more tokens", () => {
    const phrase = makeResource({
      id: "phrase",
      title: "A resource",
      worksWellWhen: ["Shutting down in session"],
    });
    const scattered = makeResource({
      id: "scattered",
      title: "Shutting activities",
      goals: ["Down regulation"],
      worksWellWhen: [],
    });

    expect(searchResources([scattered, phrase], "shutting down")[0].resource.id).toBe(
      "phrase"
    );
    expect(searchResources([makeResource()], "drawing feelings")).toHaveLength(1);
  });

  it("searches duration, telehealth, source, notes, and contained prompt text", () => {
    expect(searchResources([makeResource()], "10 minutes telehealth")).toHaveLength(1);
    expect(searchResources([makeResource()], "clinical library")).toHaveLength(1);
    expect(searchResources([makeResource()], "talking feels hard")).toHaveLength(1);

    const deck = makeResource({
      id: "deck",
      type: "prompt-deck",
      title: "Conversation Cards",
      prompts: [{ id: "prompt-1", text: "What made you feel proud today?" }],
    });
    const [result] = searchResources([deck], "feel proud");
    expect(result.matches).toContain("Matched prompt text");
  });

  it("uses deterministic title, type, and ID tie-breaking", () => {
    const resources = [
      makeResource({ id: "b", title: "Beta", tags: ["match"] }),
      makeResource({ id: "a", title: "Alpha", tags: ["match"] }),
    ];
    expect(
      searchResources(resources, "match").map(({ resource }) => resource.id)
    ).toEqual(["a", "b"]);
    expect(searchResources(resources, "match")).toEqual(
      searchResources(resources, "match")
    );
  });

  it("returns empty results for empty and unmatched queries", () => {
    expect(searchResources([makeResource()], "")).toEqual([]);
    expect(searchResources([makeResource()], "astronautical")).toEqual([]);
  });

  it("uses session context to reorder only query-relevant resources", () => {
    const alpha = makeResource({
      id: "alpha",
      title: "Alpha Activity",
      tags: ["shared"],
      goals: [],
    });
    const beta = makeResource({
      id: "beta",
      title: "Beta Activity",
      tags: ["shared"],
      goals: ["Rapport"],
    });

    expect(searchResources([beta, alpha], "shared")[0].resource.id).toBe("alpha");
    const contextualResults = searchResources([alpha, beta], "shared", {
      sessionContext: { goals: "rapport" },
    });
    expect(contextualResults[0].resource.id).toBe("beta");
    expect(contextualResults[0].matches).toContain("Matches current goal: Rapport");
    expect(
      searchResources([alpha, beta], "unrelated", {
        sessionContext: { goals: "rapport" },
      })
    ).toEqual([]);
  });

  const contextBoostCases = [
    {
      name: "age-range match",
      matchingResource: { ageRanges: ["8–10"] },
      nonmatchingResource: { ageRanges: ["14–17"] },
      sessionContext: { ageRange: "8–10" },
      explanation: "Matches current age range: 8–10",
    },
    {
      name: "diagnosis match",
      matchingResource: { diagnoses: ["Anxiety"] },
      nonmatchingResource: { diagnoses: ["ADHD"] },
      sessionContext: { diagnoses: "Anxiety" },
      explanation: "Matches current diagnosis: Anxiety",
    },
    {
      name: "goal match",
      matchingResource: { goals: ["Rapport"] },
      nonmatchingResource: { goals: ["Emotion regulation"] },
      sessionContext: { goals: "Rapport" },
      explanation: "Matches current goal: Rapport",
    },
    {
      name: "interest and tag match",
      matchingResource: { tags: ["shared", "Pokémon"] },
      nonmatchingResource: { tags: ["shared", "Minecraft"] },
      sessionContext: { interests: "Pokémon" },
      explanation: "Matches interest: Pokémon",
    },
    {
      name: "current-state and Works Well When match",
      matchingResource: { worksWellWhen: ["Shutting down"] },
      nonmatchingResource: { worksWellWhen: ["Restless"] },
      sessionContext: { currentState: "Shutting down" },
      explanation: "Matches current state: Shutting down",
    },
    {
      name: "telehealth match",
      matchingResource: { telehealthFriendly: true },
      nonmatchingResource: { telehealthFriendly: false },
      sessionContext: { telehealthSetting: "telehealth" },
      explanation: "Fits telehealth setting",
    },
    {
      name: "duration fit",
      matchingResource: { durationMinutes: 15 },
      nonmatchingResource: { durationMinutes: 45 },
      sessionContext: { sessionLengthMinutes: "30" },
      explanation: "Fits 30-minute session",
    },
    {
      name: "materials match",
      matchingResource: { materials: ["Paper"] },
      nonmatchingResource: { materials: ["Blocks"] },
      sessionContext: { materialsAvailable: "Paper" },
      explanation: "Uses available material: Paper",
    },
  ];

  it.each(contextBoostCases)(
    "independently ranks an otherwise-comparable resource higher for $name",
    ({ matchingResource, nonmatchingResource, sessionContext, explanation }) => {
      const matching = makeResource({
        id: "z-matching",
        title: "Shared activity",
        tags: ["shared"],
        kidsWhoLike: [],
        ...matchingResource,
      });
      const nonmatching = makeResource({
        id: "a-nonmatching",
        title: "Shared activity",
        tags: ["shared"],
        kidsWhoLike: [],
        ...nonmatchingResource,
      });

      const withoutContext = searchResources([matching, nonmatching], "shared");
      expect(withoutContext[0].resource.id).toBe("a-nonmatching");

      const withContext = searchResources([matching, nonmatching], "shared", {
        sessionContext,
      });
      expect(withContext[0].resource.id).toBe("z-matching");
      expect(withContext[0].matches).toContain(explanation);
      expect(withContext[1].matches).not.toContain(explanation);
    }
  );

  it("keeps strong typed-query relevance above context boosts", () => {
    const exactTitle = makeResource({ id: "exact", title: "Rapport", goals: [] });
    const contextHeavy = makeResource({
      id: "context",
      title: "Connection Activity",
      description: "Supports rapport",
      goals: ["Emotion identification"],
      diagnoses: ["Anxiety"],
      ageRanges: ["8–10"],
      kidsWhoLike: ["Pokémon"],
      worksWellWhen: ["Shutting down"],
      materials: ["Paper"],
    });
    const sessionContext = {
      ageRange: "8–10",
      diagnoses: "Anxiety",
      goals: "Emotion identification",
      interests: "Pokémon",
      currentState: "Shutting down",
      telehealthSetting: "telehealth",
      sessionLengthMinutes: "30",
      materialsAvailable: "Paper",
    };

    expect(
      searchResources([contextHeavy, exactTitle], "rapport", { sessionContext })[0]
        .resource.id
    ).toBe("exact");
  });

  it("supports every declared Resource type without type-specific branches", () => {
    const resources = resourceTypes.map((type) =>
      makeResource({ id: type, type, title: `unique ${type} example` })
    );

    for (const type of resourceTypes) {
      expect(searchResources(resources, `unique ${type} example`)[0].resource.id).toBe(
        type
      );
    }
  });

  it("does not mutate source resources", () => {
    const resource = makeResource();
    const snapshot = structuredClone(resource);
    searchResources([resource], "rapport");
    expect(resource).toEqual(snapshot);
  });
});
