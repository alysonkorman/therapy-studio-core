import { liveSessionServerMessageSchema } from "./liveSessionProtocol";

function websocketOrigin(origin) {
  return origin.replace(/^http/, "ws").replace(/\/$/, "");
}

// API Gateway only sees a short-lived, room-scoped credential. It is intentionally
// kept out of component code and never persisted in localStorage.
export function createProductionWebSocketTransport({
  credential,
  origin = import.meta.env.VITE_LIVE_SESSION_WS_ORIGIN ??
    import.meta.env.VITE_LIVE_SESSION_ORIGIN,
  role,
  sessionId,
  WebSocketImpl = globalThis.WebSocket,
}) {
  let socket;
  let handlers = {};
  let closed = false;
  const unavailable = !origin || !credential?.token || !WebSocketImpl;
  const send = (message) => {
    if (socket?.readyState === WebSocketImpl.OPEN) socket.send(JSON.stringify(message));
  };
  return {
    available: !unavailable,
    authoritative: true,
    connect(nextHandlers = {}) {
      handlers = nextHandlers;
      if (unavailable) {
        handlers.onConnectionChange?.({ state: "unavailable" });
        return;
      }
      // The token must be query-string scoped because browser WebSocket cannot set
      // Authorization headers. It expires quickly and API Gateway access logs must
      // redact query strings (documented in live-service/README.md).
      socket = new WebSocketImpl(
        `${websocketOrigin(origin)}/?credential=${encodeURIComponent(credential.token)}`
      );
      socket.onopen = () => handlers.onConnectionChange?.({ state: "connected" });
      socket.onmessage = ({ data }) => {
        let message;
        try {
          message = liveSessionServerMessageSchema.safeParse(JSON.parse(data));
        } catch {
          return;
        }
        if (!message.success) return;
        if (message.data.type === "snapshot")
          handlers.onSnapshot?.({ snapshot: message.data });
        if (message.data.type === "presence")
          handlers.onPresence?.({ role, state: "connected", ...message.data });
        if (message.data.type === "ended") handlers.onSessionEnded?.();
        if (message.data.type === "error") handlers.onConnectionError?.(message.data);
      };
      socket.onclose = () => {
        if (!closed) handlers.onConnectionChange?.({ state: "reconnecting" });
      };
      socket.onerror = () => handlers.onConnectionChange?.({ state: "reconnecting" });
    },
    disconnect() {
      closed = true;
      socket?.close();
    },
    endSession() {
      send({ type: "end" });
    },
    sendAction({ action, revision }) {
      send({ type: "action", baseRevision: revision, action, sessionId });
    },
    sendSnapshot() {}, // Only the server can publish authoritative snapshots.
  };
}
