import { describe, expect, it, vi } from "vitest";

import {
  createBroadcastWorkspaceAdapter,
  isWorkspaceDocument,
} from "./workspaceCollaborationAdapter";

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

function createAdapter(participantId, document, onRemoteDocument = vi.fn()) {
  return {
    adapter: createBroadcastWorkspaceAdapter({
      BroadcastChannelImpl: FakeBroadcastChannel,
      getDocument: () => document,
      onRemoteDocument,
      participantId,
    }),
    onRemoteDocument,
  };
}

describe("workspace collaboration adapter", () => {
  it("recognizes only workspace document messages", () => {
    expect(
      isWorkspaceDocument({ documentVersion: 1, background: "meadow", objects: [] })
    ).toBe(true);
    expect(isWorkspaceDocument({ documentVersion: 1, objects: [] })).toBe(false);
  });

  it("delivers published documents to another participant without echoing to the sender", () => {
    const first = createAdapter("first", {
      documentVersion: 1,
      background: "meadow",
      objects: [],
    });
    const second = createAdapter("second", {
      documentVersion: 1,
      background: "meadow",
      objects: [],
    });
    first.onRemoteDocument.mockClear();
    second.onRemoteDocument.mockClear();
    const changedDocument = {
      documentVersion: 1,
      background: "meadow",
      objects: [{ id: "dog" }],
    };

    first.adapter.publish(changedDocument);

    expect(second.onRemoteDocument).toHaveBeenCalledOnce();
    expect(second.onRemoteDocument).toHaveBeenCalledWith(changedDocument);
    expect(first.onRemoteDocument).not.toHaveBeenCalled();
    first.adapter.close();
    second.adapter.close();
  });

  it("answers a new participant's document request", () => {
    const existingDocument = {
      documentVersion: 1,
      background: "meadow",
      objects: [{ id: "tree" }],
    };
    const first = createAdapter("first", existingDocument);
    const second = createAdapter("second", {
      documentVersion: 1,
      background: "meadow",
      objects: [],
    });
    second.onRemoteDocument.mockClear();

    second.adapter.requestDocument();

    expect(second.onRemoteDocument).toHaveBeenCalledWith(existingDocument);
    first.adapter.close();
    second.adapter.close();
  });
});
