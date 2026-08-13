import { beforeEach, describe, expect, it, vi } from "vitest";

import { createLocalBroadcastTransport } from "./localBroadcastTransport";

class FakeBroadcastChannel {
  static channels = [];

  constructor(name) {
    this.name = name;
    FakeBroadcastChannel.channels.push(this);
  }

  close() {
    FakeBroadcastChannel.channels = FakeBroadcastChannel.channels.filter(
      (channel) => channel !== this
    );
  }

  postMessage(message) {
    FakeBroadcastChannel.channels
      .filter((channel) => channel !== this && channel.name === this.name)
      .forEach((channel) => channel.onmessage?.({ data: structuredClone(message) }));
  }
}

beforeEach(() => {
  FakeBroadcastChannel.channels = [];
});

describe("local Live Session transport", () => {
  it("keeps local session channels separate and delivers presence, bootstrap, actions, and end", () => {
    const host = createLocalBroadcastTransport({
      BroadcastChannelImpl: FakeBroadcastChannel,
      participantId: "host",
      role: "host",
      sessionId: "session-a",
    });
    const participant = createLocalBroadcastTransport({
      BroadcastChannelImpl: FakeBroadcastChannel,
      participantId: "child",
      role: "participant",
      sessionId: "session-a",
    });
    const other = createLocalBroadcastTransport({
      BroadcastChannelImpl: FakeBroadcastChannel,
      participantId: "other",
      role: "participant",
      sessionId: "session-b",
    });
    const hostHandlers = {
      onAction: vi.fn(),
      onBootstrapRequest: vi.fn(),
      onPresence: vi.fn(),
    };
    const childHandlers = { onSessionEnded: vi.fn(), onSnapshot: vi.fn() };
    host.connect(hostHandlers);
    participant.connect(childHandlers);
    other.connect({ onSnapshot: vi.fn() });

    expect(hostHandlers.onBootstrapRequest).toHaveBeenCalledWith(
      expect.objectContaining({ role: "participant" })
    );
    host.sendSnapshot({ revision: 2, state: { version: 1, objects: [] } });
    expect(childHandlers.onSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ snapshot: expect.objectContaining({ revision: 2 }) })
    );
    participant.sendAction({ action: { type: "whiteboard/replace" }, revision: 2 });
    expect(hostHandlers.onAction).toHaveBeenCalledOnce();
    host.endSession();
    expect(childHandlers.onSessionEnded).toHaveBeenCalledOnce();
  });

  it("degrades safely without BroadcastChannel", () => {
    expect(
      createLocalBroadcastTransport({
        BroadcastChannelImpl: null,
        participantId: "host",
        role: "host",
        sessionId: "session-a",
      }).available
    ).toBe(false);
  });
});
