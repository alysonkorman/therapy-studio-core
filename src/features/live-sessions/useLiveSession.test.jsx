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
          action: {
            type: "whiteboard/add",
            object: {
              id: "stroke-1",
              kind: "stroke",
              points: [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
              ],
              color: "#112233",
              width: 4,
            },
          },
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
          action: {
            type: "whiteboard/add",
            object: {
              id: "stroke-2",
              kind: "stroke",
              points: [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
              ],
              color: "#112233",
              width: 4,
            },
          },
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

  it("sends an object-level action for an authoritative transport", () => {
    const { factory, transport } = createTransport();
    transport.authoritative = true;
    const { result } = renderHook(() =>
      useLiveSession({
        adapter: whiteboardLiveSessionAdapter,
        onRemoteState: vi.fn(),
        role: "host",
        sessionId: "remote-session",
        sharedState: { version: 1, objects: [] },
        transportFactory: factory,
      })
    );
    const nextState = {
      version: 1,
      objects: [
        {
          id: "stroke-1",
          kind: "stroke",
          points: [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
          ],
          color: "#112233",
          width: 4,
        },
      ],
    };

    act(() => result.current.publishState(nextState));

    expect(transport.sendAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.objectContaining({ type: "whiteboard/add" }),
        revision: 0,
      })
    );
  });

  it("sends a participant-only undo request without replacing shared state", () => {
    const { factory, transport } = createTransport();
    transport.authoritative = true;
    const { result } = renderHook(() =>
      useLiveSession({
        adapter: whiteboardLiveSessionAdapter,
        onRemoteState: vi.fn(),
        role: "participant",
        sessionId: "remote-session",
        sharedState: { version: 1, objects: [] },
        transportFactory: factory,
      })
    );

    act(() => result.current.requestAction({ type: "whiteboard/undo-participant" }));

    expect(transport.sendAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: { type: "whiteboard/undo-participant" },
        revision: 0,
      })
    );
  });

  it("keeps an active transport connected when the local shared state changes", () => {
    const { factory, transport } = createTransport();
    const initialProps = {
      adapter: whiteboardLiveSessionAdapter,
      onRemoteState: vi.fn(),
      role: "host",
      sessionId: "remote-session",
      sharedState: { version: 1, objects: [] },
      transportFactory: factory,
    };
    const { rerender } = renderHook((props) => useLiveSession(props), {
      initialProps,
    });

    rerender({
      ...initialProps,
      sharedState: {
        version: 1,
        objects: [
          {
            id: "stroke-1",
            kind: "stroke",
            points: [
              { x: 1, y: 1 },
              { x: 2, y: 2 },
            ],
            color: "#112233",
            width: 4,
          },
        ],
      },
    });

    expect(factory).toHaveBeenCalledOnce();
    expect(transport.disconnect).not.toHaveBeenCalled();
  });
});
