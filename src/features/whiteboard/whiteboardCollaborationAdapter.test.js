import { beforeEach, describe, expect, it, vi } from "vitest";

import { createWhiteboardCollaborationAdapter } from "./whiteboardCollaborationAdapter";

class FakeChannel {
  static channels = [];
  constructor() {
    FakeChannel.channels.push(this);
  }
  postMessage(data) {
    FakeChannel.channels
      .filter((channel) => channel !== this)
      .forEach((channel) => channel.onmessage?.({ data }));
  }
  close() {}
}

beforeEach(() => {
  FakeChannel.channels = [];
});

describe("Whiteboard collaboration adapter", () => {
  it("shares one board between same-origin tabs and ignores other boards", () => {
    const receive = vi.fn();
    const first = createWhiteboardCollaborationAdapter({
      BroadcastChannelImpl: FakeChannel,
      boardId: "one",
      onRemoteDocument: vi.fn(),
      participantId: "first",
    });
    createWhiteboardCollaborationAdapter({
      BroadcastChannelImpl: FakeChannel,
      boardId: "one",
      onRemoteDocument: receive,
      participantId: "second",
    });
    createWhiteboardCollaborationAdapter({
      BroadcastChannelImpl: FakeChannel,
      boardId: "other",
      onRemoteDocument: vi.fn(),
      participantId: "third",
    });
    first.publish({ id: "one", objects: [] });
    expect(receive).toHaveBeenCalledWith({ id: "one", objects: [] });
  });

  it("degrades safely when BroadcastChannel is unavailable", () => {
    expect(
      createWhiteboardCollaborationAdapter({ BroadcastChannelImpl: null }).available
    ).toBe(false);
  });
});
