import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionProfile } from "../models/sessionProfile";
import { emptyCurrentSession, useCurrentSessionStore } from "./currentSessionStore";
import {
  clearActiveProfileIfMatching,
  useActiveSessionProfileStore,
} from "./activeSessionProfileStore";

const profile = createSessionProfile(
  { displayName: "Art Kid", interests: ["Art"] },
  { id: "profile-1", now: "2026-08-04T12:00:00.000Z" }
);
beforeEach(() => {
  useActiveSessionProfileStore.setState({ activeProfileId: null, activeProfile: null });
  useCurrentSessionStore.setState({ context: { ...emptyCurrentSession } });
});

describe("active Session Profile store", () => {
  it("sets, gets, and clears an active profile without changing Current Session", async () => {
    const repository = { markSessionProfileOpened: vi.fn(async () => profile) };
    await useActiveSessionProfileStore
      .getState()
      .setActiveProfile(profile.id, repository);
    expect(useActiveSessionProfileStore.getState().getActiveProfile()).toEqual(profile);
    expect(useCurrentSessionStore.getState().context).toEqual(emptyCurrentSession);
    clearActiveProfileIfMatching(profile.id);
    expect(useActiveSessionProfileStore.getState().activeProfileId).toBeNull();
  });
  it("loads a copy into Current Session while keeping profile data independent", () => {
    useActiveSessionProfileStore.getState().loadProfileIntoCurrentSession(profile);
    useCurrentSessionStore.getState().updateField("interests", "Painting");
    expect(profile.interests).toEqual(["Art"]);
    useCurrentSessionStore.getState().clearContext();
    expect(profile.displayName).toBe("Art Kid");
  });
});
