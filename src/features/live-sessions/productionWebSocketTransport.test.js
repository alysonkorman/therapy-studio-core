import { afterEach, describe, expect, it, vi } from "vitest";

import { createProductionWebSocketTransport } from "./productionWebSocketTransport";

class FakeSocket {
  static OPEN = 1;
  static instances = [];
  constructor() { FakeSocket.instances.push(this); this.readyState = 0; }
  close() { this.onclose?.(); }
  send() {}
}

afterEach(() => { FakeSocket.instances = []; vi.useRealTimers(); });

describe("production WebSocket reconnect", () => {
  it("reconnects after an unexpected close and stops after disconnect", () => {
    vi.useFakeTimers();
    const changes = [];
    const transport = createProductionWebSocketTransport({
      credential: { token: "x".repeat(32) },
      origin: "https://live.example.test",
      role: "host",
      sessionId: "session-123456789",
      WebSocketImpl: FakeSocket,
    });
    transport.connect({ onConnectionChange: ({ state }) => changes.push(state) });
    FakeSocket.instances[0].onopen();
    FakeSocket.instances[0].onclose();
    expect(changes).toEqual(["connected", "reconnecting"]);
    vi.advanceTimersByTime(1000);
    expect(FakeSocket.instances).toHaveLength(2);
    transport.disconnect();
    vi.advanceTimersByTime(10000);
    expect(FakeSocket.instances).toHaveLength(2);
  });
});
