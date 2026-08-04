import { describe, expect, it } from "vitest";
import { emptyCurrentSession } from "../../stores/currentSessionStore";
import { createSessionProfile } from "../../models/sessionProfile";
import {
  applySessionProfileToCurrentSession,
  mapSessionProfileToCurrentSession,
} from "./mapSessionProfileToCurrentSession";

const profile = createSessionProfile(
  {
    displayName: "Dinosaur Kid",
    goals: ["Rapport"],
    interests: ["Dinosaurs"],
    preferredActivities: ["Games"],
    materialsUsuallyAvailable: ["Paper"],
    generalReminders: "Offer choices",
  },
  { id: "p", now: "2026-08-04T12:00:00.000Z" }
);

describe("Session Profile Current Session mapping", () => {
  it("maps only safe direct fields", () => {
    expect(mapSessionProfileToCurrentSession(profile)).toMatchObject({
      genericClientId: "Dinosaur Kid",
      goals: "Rapport",
      interests: "Dinosaurs",
      materialsAvailable: "Paper",
      customNotes: "Offer choices",
    });
    expect(mapSessionProfileToCurrentSession(profile)).not.toHaveProperty(
      "preferredActivities"
    );
  });
  it("fills empty fields, replaces explicitly, and cancels without changes", () => {
    const current = { ...emptyCurrentSession, goals: "Existing" };
    expect(applySessionProfileToCurrentSession(profile, current).goals).toBe("Existing");
    expect(
      applySessionProfileToCurrentSession(profile, current, { mode: "replace" }).goals
    ).toBe("Rapport");
    expect(
      applySessionProfileToCurrentSession(profile, current, { mode: "cancel" })
    ).toBe(current);
  });
});
