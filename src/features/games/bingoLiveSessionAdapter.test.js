import { describe, expect, it } from "vitest";

import { bingoLiveSessionAdapter } from "./bingoLiveSessionAdapter";

const state = {
  version: 1,
  title: "Bingo",
  board: { size: 3, hasFreeSpace: false, cells: [{ id: "one", text: "One" }] },
  marked: [],
};

describe("Bingo live-session adapter", () => {
  it("allows either player to toggle a valid cell", () => {
    const action = { type: "bingo/toggle", cellId: "one" };
    expect(bingoLiveSessionAdapter.validateAction("participant", action, state).success).toBe(true);
    expect(bingoLiveSessionAdapter.applyAction(state, action).marked).toEqual(["one"]);
  });

  it("reserves board replacement for the host", () => {
    const action = { type: "bingo/replace", state };
    expect(bingoLiveSessionAdapter.validateAction("host", action, state).success).toBe(true);
    expect(bingoLiveSessionAdapter.validateAction("participant", action, state).success).toBe(false);
  });

  it("rejects unknown and free-space toggles", () => {
    const withFree = { ...state, board: { ...state.board, cells: [{ id: "free", text: "Free", free: true }] }, marked: ["free"] };
    expect(bingoLiveSessionAdapter.validateAction("participant", { type: "bingo/toggle", cellId: "missing" }, state).success).toBe(false);
    expect(bingoLiveSessionAdapter.validateAction("participant", { type: "bingo/toggle", cellId: "free" }, withFree).success).toBe(false);
  });
});
