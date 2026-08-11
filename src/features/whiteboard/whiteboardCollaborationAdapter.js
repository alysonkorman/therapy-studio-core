const CHANNEL_NAME = "therapy-studio-whiteboard-v1";

export function createWhiteboardCollaborationAdapter({
  BroadcastChannelImpl = globalThis.BroadcastChannel,
  boardId,
  onRemoteDocument,
  participantId,
}) {
  if (!BroadcastChannelImpl) return { available: false, close() {}, publish() {} };
  const channel = new BroadcastChannelImpl(CHANNEL_NAME);
  channel.onmessage = ({ data }) => {
    if (
      data?.type === "whiteboard/update" &&
      data.boardId === boardId &&
      data.participantId !== participantId
    ) {
      onRemoteDocument(data.document);
    }
  };
  return {
    available: true,
    close() {
      channel.close();
    },
    publish(document) {
      channel.postMessage({
        type: "whiteboard/update",
        boardId,
        participantId,
        document,
      });
    },
  };
}
