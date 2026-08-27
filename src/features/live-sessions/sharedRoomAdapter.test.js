import { describe, expect, it } from "vitest";

import { initialSharedRoomState, sharedRoomAdapter } from "./sharedRoomAdapter";

describe("shared room adapter", () => {
  it("keeps each activity state while changing the child-facing activity", () => {
    const withMemory = sharedRoomAdapter.applyAction(initialSharedRoomState, {
      type: "room/select-activity",
      activityKind: "memory",
      state: { matched: ["cat"] },
    });
    const withISpy = sharedRoomAdapter.applyAction(withMemory, {
      type: "room/select-activity",
      activityKind: "i-spy",
      state: { progress: 2 },
    });
    expect(withISpy).toMatchObject({
      activityKind: "i-spy",
      view: "activity",
      activityStates: { memory: { matched: ["cat"] }, "i-spy": { progress: 2 } },
    });
  });

  it("allows only the host to change waiting room and permission state", () => {
    expect(
      sharedRoomAdapter.validateAction("participant", { type: "room/wait" }).success
    ).toBe(false);
    expect(
      sharedRoomAdapter.validateAction("host", {
        type: "room/permission",
        permission: "create",
      }).success
    ).toBe(true);
    expect(
      sharedRoomAdapter.applyAction(initialSharedRoomState, {
        type: "room/permission",
        permission: "watch",
      }).permission
    ).toBe("watch");
  });
});
