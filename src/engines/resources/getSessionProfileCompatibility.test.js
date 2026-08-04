import { describe, expect, it } from "vitest";
import { getSessionProfileCompatibility } from "./getSessionProfileCompatibility";

const profile = {
  ageRange: "8–10",
  diagnoses: ["ADHD"],
  goals: ["Rapport"],
  interests: ["Animals"],
  sessionLengthPreference: 30,
  telehealth: true,
};
const resource = {
  ageRanges: ["8–10"],
  diagnoses: ["ADHD"],
  goals: ["Rapport"],
  kidsWhoLike: ["Animals"],
  tags: [],
  durationMinutes: 20,
  telehealthFriendly: true,
};

describe("Session Profile compatibility", () => {
  it.each([
    ["ageRange", { ageRanges: [] }, "Matches age range"],
    ["diagnosis", { diagnoses: [] }, "Matches diagnosis"],
    ["goal", { goals: [] }, "Matches goal"],
    ["interest", { kidsWhoLike: [] }, "Matches interest or tag"],
    ["duration", { durationMinutes: 60 }, "Fits session length"],
    ["telehealth", { telehealthFriendly: false }, "Telehealth compatible"],
  ])("independently reports the %s match", (_name, mismatch, label) => {
    expect(getSessionProfileCompatibility(resource, profile)).toContain(label);
    expect(
      getSessionProfileCompatibility({ ...resource, ...mismatch }, profile)
    ).not.toContain(label);
  });
  it("returns nothing without a profile and never mutates the resource", () => {
    const before = structuredClone(resource);
    expect(getSessionProfileCompatibility(resource, null)).toEqual([]);
    getSessionProfileCompatibility(resource, profile);
    expect(resource).toEqual(before);
  });
});
