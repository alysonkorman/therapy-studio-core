const CHANNEL_NAME = "therapy-studio-workspace-lab-v0";

export function isWorkspaceDocument(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    value.documentVersion === 1 &&
    typeof value.background === "string" &&
    Array.isArray(value.objects)
  );
}

export function createBroadcastWorkspaceAdapter({
  BroadcastChannelImpl = globalThis.BroadcastChannel,
  getDocument,
  onConnectionChange,
  onRemoteDocument,
  participantId,
}) {
  if (!BroadcastChannelImpl) {
    onConnectionChange?.({ available: false, peerCount: 0 });
    return {
      close() {},
      publish() {},
      requestDocument() {},
    };
  }

  const channel = new BroadcastChannelImpl(CHANNEL_NAME);
  const peers = new Set();

  function notifyConnection() {
    onConnectionChange?.({ available: true, peerCount: peers.size });
  }

  function post(type, payload = {}) {
    channel.postMessage({ type, participantId, ...payload });
  }

  channel.onmessage = ({ data }) => {
    if (!data || data.participantId === participantId) return;

    if (data.type === "participant/hello") {
      peers.add(data.participantId);
      notifyConnection();
      post("participant/acknowledge");
    } else if (data.type === "participant/acknowledge") {
      peers.add(data.participantId);
      notifyConnection();
    } else if (data.type === "participant/goodbye") {
      peers.delete(data.participantId);
      notifyConnection();
    } else if (data.type === "document/request") {
      post("document/update", { document: getDocument() });
    } else if (data.type === "document/update" && isWorkspaceDocument(data.document)) {
      onRemoteDocument(data.document);
    }
  };

  notifyConnection();
  post("participant/hello");

  return {
    close() {
      post("participant/goodbye");
      channel.close();
    },
    publish(document) {
      post("document/update", { document });
    },
    requestDocument() {
      post("document/request");
    },
  };
}
