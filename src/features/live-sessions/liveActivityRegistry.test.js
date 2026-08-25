import { describe, expect, it } from "vitest";

import { getLiveActivity, getSupportedLiveActivityKinds } from "./liveActivityRegistry";

describe("Live Activity registry", () => {
  it("resolves the registered Whiteboard participant view and adapter", () => {
    const activity = getLiveActivity("whiteboard");

    expect(activity?.activityKind).toBe("whiteboard");
    expect(activity?.adapter.activityKind).toBe("whiteboard");
    expect(activity?.ParticipantView).toBeTypeOf("function");
    expect(getSupportedLiveActivityKinds()).toEqual(["whiteboard", "bingo"]);
  });

  it("fails safely for an activity that has not been registered", () => {
    expect(getLiveActivity("bingo")?.adapter.activityKind).toBe("bingo");
    expect(getLiveActivity("scene-builder")).toBeNull();
  });
});
