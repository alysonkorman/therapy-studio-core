import { afterEach, describe, expect, it } from "vitest";

import {
  loadActivityHub,
  markActivityUsed,
  toggleActivityFavorite,
} from "./activityHubStore";

afterEach(() => localStorage.clear());

describe("activity hub local state", () => {
  it("keeps favorites separate from ordered recently used activity ids", () => {
    const favorite = toggleActivityFavorite(loadActivityHub(), "spot-it");
    const recent = markActivityUsed(
      markActivityUsed(favorite, "memory-match"),
      "spot-it"
    );
    expect(recent.favorites).toEqual(["spot-it"]);
    expect(recent.recent).toEqual(["spot-it", "memory-match"]);
  });
});
