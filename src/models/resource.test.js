import { describe, expect, it } from "vitest";

import { createResource } from "./resource";

describe("createResource", () => {
  it("creates a valid resource with generated fields and defaults", () => {
    const resource = createResource({ type: "prompt", title: "Check In" });

    expect(resource.id).toEqual(expect.any(String));
    expect(resource.createdAt).toEqual(expect.any(String));
    expect(resource.updatedAt).toEqual(expect.any(String));
    expect(resource.description).toBe("");
    expect(resource.worksWellWhen).toEqual([]);
    expect(resource.durationMinutes).toBeNull();
    expect(resource.telehealthFriendly).toBe(true);
    expect(resource.favorite).toBe(false);
    expect(resource.rating).toBeNull();
    expect(resource.usageCount).toBe(0);
    expect(resource.lastUsedAt).toBeNull();
  });

  it("preserves supplied metadata", () => {
    const resource = createResource({
      type: "intervention",
      title: "Feelings Jenga",
      description: "Explore emotions through play.",
      worksWellWhen: ["Conversation feels stuck"],
      goals: ["Emotion identification"],
      ageRanges: ["8–10"],
      durationMinutes: 15,
      source: "Clinical library",
      research: ["Supporting study"],
      myNotes: "Offer choices.",
      rating: 4,
      favorite: true,
    });

    expect(resource).toMatchObject({
      description: "Explore emotions through play.",
      worksWellWhen: ["Conversation feels stuck"],
      goals: ["Emotion identification"],
      ageRanges: ["8–10"],
      durationMinutes: 15,
      source: "Clinical library",
      research: ["Supporting study"],
      myNotes: "Offer choices.",
      rating: 4,
      favorite: true,
    });
  });

  it("rejects invalid required data", () => {
    expect(() => createResource({ type: "prompt", title: "" })).toThrow();
    expect(() => createResource({ type: "unknown", title: "Invalid" })).toThrow();
  });
});
