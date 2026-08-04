import { describe, expect, it } from "vitest";

import { createDefaultResourceMemory, resourceMemorySchema } from "./resourceMemory";

const timestamp = "2026-08-04T12:00:00.000Z";

describe("resourceMemorySchema", () => {
  it("creates the approved defaults", () => {
    expect(createDefaultResourceMemory("resource-1", timestamp)).toEqual({
      resourceId: "resource-1",
      createdAt: timestamp,
      updatedAt: timestamp,
      favorite: false,
      rating: null,
      useCount: 0,
      lastUsedAt: null,
      therapistNotes: "",
      worksWellWhen: [],
      kidsWhoUsuallyLikeThis: [],
      adaptations: [],
    });
  });

  it("accepts a complete valid memory record", () => {
    expect(
      resourceMemorySchema.parse({
        ...createDefaultResourceMemory("resource-1", timestamp),
        favorite: true,
        rating: 5,
        useCount: 2,
        lastUsedAt: timestamp,
        therapistNotes: "First line\nSecond line",
        worksWellWhen: ["Low verbal"],
        kidsWhoUsuallyLikeThis: ["Animals"],
        adaptations: ["Offer drawing"],
      })
    ).toMatchObject({ favorite: true, rating: 5, useCount: 2 });
  });

  it("normalizes blanks and case-insensitive duplicate array values", () => {
    const parsed = resourceMemorySchema.parse({
      ...createDefaultResourceMemory("resource-1", timestamp),
      worksWellWhen: [" Shutdown ", "", "shutdown", "Needs movement"],
    });
    expect(parsed.worksWellWhen).toEqual(["Shutdown", "Needs movement"]);
  });

  it.each([0, 6, 2.5])("rejects invalid rating %s", (rating) => {
    expect(() =>
      resourceMemorySchema.parse({
        ...createDefaultResourceMemory("resource-1", timestamp),
        rating,
      })
    ).toThrow();
  });

  it("rejects negative usage, HTML, unknown fields, and identity fields", () => {
    const base = createDefaultResourceMemory("resource-1", timestamp);
    expect(() => resourceMemorySchema.parse({ ...base, useCount: -1 })).toThrow();
    expect(() =>
      resourceMemorySchema.parse({ ...base, therapistNotes: "<strong>private</strong>" })
    ).toThrow();
    expect(() => resourceMemorySchema.parse({ ...base, clientId: "person-1" })).toThrow();
    expect(() =>
      resourceMemorySchema.parse({ ...base, sessionNarrative: "Details" })
    ).toThrow();
  });
});
