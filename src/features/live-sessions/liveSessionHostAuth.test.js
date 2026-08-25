import { afterEach, describe, expect, it, vi } from "vitest";

import {
  captureCognitoHostToken,
  consumePostLoginPath,
  consumePendingLiveSessionInvite,
  rememberPostLoginPath,
  rememberPendingLiveSessionInvite,
} from "./liveSessionHostAuth";

afterEach(() => sessionStorage.clear());

describe("Live Session host authentication", () => {
  it("captures an ID token, removes it from the visible URL, and retains a pending invite", () => {
    const replaceState = vi.fn();
    rememberPendingLiveSessionInvite();

    expect(
      captureCognitoHostToken(
        { hash: "#id_token=test-id-token", pathname: "/whiteboard", search: "" },
        { replaceState }
      )
    ).toBe("test-id-token");
    expect(replaceState).toHaveBeenCalledWith(null, "", "/whiteboard");
    expect(consumePendingLiveSessionInvite()).toBe(true);
    expect(consumePendingLiveSessionInvite()).toBe(false);
  });

  it("keeps a requested route through host sign-in", () => {
    rememberPostLoginPath("/prompts");

    expect(consumePostLoginPath()).toBe("/prompts");
    expect(consumePostLoginPath()).toBeNull();
  });
});
