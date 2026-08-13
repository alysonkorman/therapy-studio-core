const transportVersion = 1;

function channelName(sessionId) {
  return `therapy-studio-live-session-local-v1:${sessionId}`;
}

// Local-development transport only. BroadcastChannel cannot cross origins or
// devices; this mirrors the future room transport contract without claiming to
// provide internet collaboration.
export function createLocalBroadcastTransport({
  BroadcastChannelImpl = globalThis.BroadcastChannel,
  participantId,
  role,
  sessionId,
}) {
  if (!BroadcastChannelImpl) {
    return {
      available: false,
      connect() {},
      disconnect() {},
      endSession() {},
      sendAction() {},
      sendSnapshot() {},
    };
  }

  const channel = new BroadcastChannelImpl(channelName(sessionId));
  let handlers = {};
  let connected = false;

  function post(type, payload = {}) {
    channel.postMessage({
      type,
      version: transportVersion,
      sessionId,
      participantId,
      role,
      ...payload,
    });
  }

  channel.onmessage = ({ data }) => {
    if (
      !data ||
      data.version !== transportVersion ||
      data.sessionId !== sessionId ||
      data.participantId === participantId
    )
      return;
    if (data.type === "live/presence") handlers.onPresence?.(data);
    if (data.type === "live/bootstrap/request") handlers.onBootstrapRequest?.(data);
    if (data.type === "live/snapshot") handlers.onSnapshot?.(data);
    if (data.type === "live/action") handlers.onAction?.(data);
    if (data.type === "live/end") handlers.onSessionEnded?.(data);
  };

  return {
    available: true,
    connect(nextHandlers = {}) {
      handlers = nextHandlers;
      connected = true;
      post("live/presence", { state: "connected" });
      post("live/bootstrap/request");
      handlers.onConnectionChange?.({ state: "connected" });
    },
    disconnect() {
      if (connected) post("live/presence", { state: "disconnected" });
      connected = false;
      channel.close();
    },
    endSession() {
      post("live/end");
    },
    sendAction(envelope) {
      post("live/action", { envelope });
    },
    sendSnapshot(snapshot) {
      post("live/snapshot", { snapshot });
    },
  };
}
