import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";

import { createBroadcastWorkspaceAdapter } from "./workspaceCollaborationAdapter";
import { initialWorkspaceDocument, workspaceDocumentReducer } from "./workspaceDocument";

export default function useCollaborativeWorkspaceDocument() {
  const [document, setDocument] = useState(initialWorkspaceDocument);
  const [connection, setConnection] = useState({ available: true, peerCount: 0 });
  const documentRef = useRef(document);
  const adapterRef = useRef(null);
  const participantIdRef = useRef(nanoid());

  useEffect(() => {
    const adapter = createBroadcastWorkspaceAdapter({
      getDocument: () => documentRef.current,
      onConnectionChange: setConnection,
      onRemoteDocument: (remoteDocument) => {
        documentRef.current = remoteDocument;
        setDocument(remoteDocument);
      },
      participantId: participantIdRef.current,
    });
    adapterRef.current = adapter;
    adapter.requestDocument();

    return () => {
      adapter.close();
      adapterRef.current = null;
    };
  }, []);

  const changeDocument = useCallback((action) => {
    setDocument((currentDocument) => {
      const nextDocument = workspaceDocumentReducer(currentDocument, action);
      documentRef.current = nextDocument;
      adapterRef.current?.publish(nextDocument);
      return nextDocument;
    });
  }, []);

  const replaceDocument = useCallback((nextDocument) => {
    documentRef.current = nextDocument;
    setDocument(nextDocument);
    adapterRef.current?.publish(nextDocument);
  }, []);

  return { changeDocument, connection, document, replaceDocument };
}
