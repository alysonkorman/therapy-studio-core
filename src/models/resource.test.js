import { describe, expect, it } from "vitest";

import {
  assertUniqueResourceIds,
  createResource,
  getResourceKey,
  resourceTypes,
} from "./resource";

describe("createResource", () => {
  it("creates a valid resource with generated fields and defaults", () => {
    const resource = createResource({ type: "prompt", title: "Check In" });

    expect(resource.id).toEqual(expect.any(String));
    expect(resource.createdAt).toEqual(expect.any(String));
    expect(resource.updatedAt).toEqual(expect.any(String));
    expect(resource.description).toBe("");
    expect(resource.tags).toEqual([]);
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
      tags: ["play", "feelings"],
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
      tags: ["play", "feelings"],
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

  it("recognizes Activity through the authoritative Resource type contract", () => {
    expect(resourceTypes).toContain("activity");
    expect(createResource({ type: "activity", title: "Movement Break" })).toMatchObject({
      type: "activity",
      title: "Movement Break",
    });
  });
});

describe("Resource identity", () => {
  it("creates type-aware keys without changing stored IDs", () => {
    expect(getResourceKey({ id: "123", type: "prompt-deck" })).toBe("prompt-deck:123");
    expect(getResourceKey({ id: "123", type: "worksheet" })).toBe("worksheet:123");
  });

  it("rejects duplicate global IDs across Resource types", () => {
    expect(() =>
      assertUniqueResourceIds([
        { id: "shared-id", type: "prompt-deck" },
        { id: "shared-id", type: "worksheet" },
      ])
    ).toThrow("Duplicate global Resource ID: shared-id");
  });
});
