import { describe, expect, it } from "vitest";

import { participantUrlForActivity } from "./liveSessionApi";

describe("participantUrlForActivity", () => {
  it.each(["memory", "spot-it"])(
    "preserves the join capability and records the %s game",
    (activityKind) => {
      const url = new URL(
        participantUrlForActivity({
          activityKind,
          participantUrl: "/join/session-123#p=invite-capability",
          siteOrigin: "https://therapy.example",
        })
      );

      expect(url.pathname).toBe("/join/session-123");
      expect(url.hash).toBe(`#p=invite-capability&activity=${activityKind}`);
    }
  );
});
