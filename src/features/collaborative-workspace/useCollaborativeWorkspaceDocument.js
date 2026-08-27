import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";

import { createBroadcastWorkspaceAdapter } from "./workspaceCollaborationAdapter";
import { initialWorkspaceDocument, workspaceDocumentReducer } from "./workspaceDocument";

export default function useCollaborativeWorkspaceDocument() {
  const [document, setDocument] = useState(initialWorkspaceDocument);
  const [connection, setConnection] = useState({ available: true, peerCount: 0 });
  const documentRef = useRef(document);
  const historyRef = useRef({ past: [], future: [] });
  const [history, setHistory] = useState({ canRedo: false, canUndo: false });
  const adapterRef = useRef(null);
  const participantIdRef = useRef(nanoid());

  useEffect(() => {
    const adapter = createBroadcastWorkspaceAdapter({
      getDocument: () => documentRef.current,
      onConnectionChange: setConnection,
      onRemoteDocument: (remoteDocument) => {
        documentRef.current = remoteDocument;
        setDocument(remoteDocument);
        historyRef.current = { past: [], future: [] };
        setHistory({ canRedo: false, canUndo: false });
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
      if (nextDocument !== currentDocument) {
        const past = [...historyRef.current.past, structuredClone(currentDocument)].slice(
          -80
        );
        historyRef.current = { past, future: [] };
        setHistory({ canUndo: past.length > 0, canRedo: false });
      }
      documentRef.current = nextDocument;
      adapterRef.current?.publish(nextDocument);
      return nextDocument;
    });
  }, []);

  const replaceDocument = useCallback((nextDocument) => {
    documentRef.current = nextDocument;
    setDocument(nextDocument);
    adapterRef.current?.publish(nextDocument);
    historyRef.current = { past: [], future: [] };
    setHistory({ canRedo: false, canUndo: false });
  }, []);

  const undo = useCallback(() => {
    const previous = historyRef.current.past.at(-1);
    if (!previous) return;
    const future = [
      structuredClone(documentRef.current),
      ...historyRef.current.future,
    ].slice(0, 80);
    const past = historyRef.current.past.slice(0, -1);
    historyRef.current = { past, future };
    documentRef.current = previous;
    setDocument(previous);
    setHistory({ canUndo: past.length > 0, canRedo: future.length > 0 });
    adapterRef.current?.publish(previous);
  }, []);

  const redo = useCallback(() => {
    const next = historyRef.current.future[0];
    if (!next) return;
    const past = [...historyRef.current.past, structuredClone(documentRef.current)].slice(
      -80
    );
    const future = historyRef.current.future.slice(1);
    historyRef.current = { past, future };
    documentRef.current = next;
    setDocument(next);
    setHistory({ canUndo: past.length > 0, canRedo: future.length > 0 });
    adapterRef.current?.publish(next);
  }, []);

  return { changeDocument, connection, document, history, redo, replaceDocument, undo };
}
