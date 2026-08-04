import { describe, expect, it } from "vitest";

import { createSessionProfile, sessionProfileSchema } from "./sessionProfile";

const now = "2026-08-04T12:00:00.000Z";

describe("Session Profile model", () => {
  it("creates a minimal non-identifying profile with defaults", () => {
    const profile = createSessionProfile(
      { displayName: "Dinosaur Kid" },
      { id: "profile-1", now }
    );
    expect(profile).toMatchObject({
      id: "profile-1",
      displayName: "Dinosaur Kid",
      archived: false,
      diagnoses: [],
      generalReminders: "",
    });
  });

  it("accepts every approved field and normalizes arrays", () => {
    const profile = createSessionProfile(
      {
        displayName: "Art and Animals",
        interests: [" Art ", "art", "", "Animals"],
        telehealth: true,
        sessionLengthPreference: 45,
      },
      { id: "profile-2", now }
    );
    expect(profile.interests).toEqual(["Art", "Animals"]);
  });

  it("rejects unknown or identifying fields, blank names, and HTML reminders", () => {
    expect(() =>
      sessionProfileSchema.parse({
        ...createSessionProfile({ displayName: "Safe" }, { id: "p", now }),
        email: "person@example.com",
      })
    ).toThrow();
    expect(() => createSessionProfile({ displayName: " " }, { id: "p", now })).toThrow();
    expect(() =>
      createSessionProfile(
        { displayName: "Safe", generalReminders: "<b>note</b>" },
        { id: "p", now }
      )
    ).toThrow();
  });
});
