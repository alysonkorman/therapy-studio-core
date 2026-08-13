import { renderHook } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";

import { whiteboardLiveSessionAdapter } from "../whiteboard/whiteboardLiveSessionAdapter";
import { useLiveSession } from "./useLiveSession";

function createTransport() {
  const transport = {
    available: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    endSession: vi.fn(),
    sendAction: vi.fn(),
    sendSnapshot: vi.fn(),
  };
  const factory = vi.fn(() => transport);
  return { factory, transport };
}

describe("Live Session controller", () => {
  it("bootstraps a participant, ignores stale snapshots, and observes session end", () => {
    const { factory, transport } = createTransport();
    const onRemoteState = vi.fn();
    const { result } = renderHook(() =>
      useLiveSession({
        adapter: whiteboardLiveSessionAdapter,
        onRemoteState,
        role: "participant",
        sessionId: "local-session",
        sharedState: { version: 1, objects: [] },
        transportFactory: factory,
      })
    );
    const handlers = transport.connect.mock.calls[0][0];

    act(() => {
      handlers.onSnapshot({
        snapshot: { revision: 3, state: { version: 1, objects: [] } },
      });
      handlers.onSnapshot({
        snapshot: { revision: 2, state: { version: 1, objects: [] } },
      });
    });
    expect(onRemoteState).toHaveBeenCalledOnce();
    expect(result.current.status).toBe("connected");

    act(() => handlers.onSessionEnded());
    expect(result.current.status).toBe("ended");
  });

  it("lets the host bootstrap valid participant actions and rejects stale actions", () => {
    const { factory, transport } = createTransport();
    const onRemoteState = vi.fn();
    renderHook(() =>
      useLiveSession({
        adapter: whiteboardLiveSessionAdapter,
        onRemoteState,
        role: "host",
        sessionId: "local-session",
        sharedState: { version: 1, objects: [] },
        transportFactory: factory,
      })
    );
    const handlers = transport.connect.mock.calls[0][0];

    act(() => handlers.onBootstrapRequest({ role: "participant" }));
    expect(transport.sendSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ revision: 0 })
    );

    act(() =>
      handlers.onAction({
        envelope: {
          action: { type: "whiteboard/replace", state: { version: 1, objects: [] } },
          revision: 0,
          role: "participant",
          sessionId: "local-session",
        },
      })
    );
    expect(onRemoteState).toHaveBeenCalledOnce();
    expect(transport.sendSnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({ revision: 1 })
    );

    act(() =>
      handlers.onAction({
        envelope: {
          action: { type: "whiteboard/replace", state: { version: 1, objects: [] } },
          revision: 0,
          role: "participant",
          sessionId: "local-session",
        },
      })
    );
    expect(onRemoteState).toHaveBeenCalledOnce();
    expect(transport.sendSnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({ revision: 1 })
    );
  });
});
