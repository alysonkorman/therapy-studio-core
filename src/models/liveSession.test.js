import { describe, expect, it } from "vitest";

import { createLiveSession, liveSessionSchema } from "./liveSession";

const now = "2026-08-13T12:00:00.000Z";

describe("Live Session model", () => {
  it("creates versioned, privacy-minimal session metadata", () => {
    expect(
      createLiveSession({
        activityKind: "whiteboard",
        expiresAt: "2026-08-13T14:00:00.000Z",
        id: "session-1",
        now,
      })
    ).toEqual({
      activityKind: "whiteboard",
      createdAt: now,
      expiresAt: "2026-08-13T14:00:00.000Z",
      id: "session-1",
      revision: 0,
      status: "waiting",
      version: 1,
    });
  });

  it("rejects private details and transport credentials", () => {
    expect(() =>
      liveSessionSchema.parse({
        ...createLiveSession({
          activityKind: "whiteboard",
          expiresAt: "2026-08-13T14:00:00.000Z",
          id: "session-1",
          now,
        }),
        childName: "A child",
      })
    ).toThrow();
  });
});
