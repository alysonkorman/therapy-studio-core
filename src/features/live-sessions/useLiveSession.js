import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";

import { liveSessionActionEnvelopeSchema } from "./liveSessionAdapter";
import { createLocalBroadcastTransport } from "./localBroadcastTransport";

export function useLiveSession({
  adapter,
  onRemoteState,
  role,
  sessionId,
  sharedState,
  transportFactory = createLocalBroadcastTransport,
}) {
  const stateRef = useRef(sharedState);
  const revisionRef = useRef(0);
  const transportRef = useRef(null);
  const participantIdRef = useRef(nanoid());
  const [status, setStatus] = useState(sessionId ? "connecting" : "idle");
  const [participantState, setParticipantState] = useState("waiting");

  useEffect(() => {
    stateRef.current = sharedState;
  }, [sharedState]);

  useEffect(() => {
    revisionRef.current = 0;
    if (!sessionId || !role) {
      return undefined;
    }
    const transport = transportFactory({
      participantId: participantIdRef.current,
      role,
      sessionId,
    });
    transportRef.current = transport;
    transport.connect({
      onAction({ envelope }) {
        if (role !== "host") return;
        const parsed = liveSessionActionEnvelopeSchema.safeParse(envelope);
        if (!parsed.success || parsed.data.sessionId !== sessionId) return;
        if (parsed.data.revision !== revisionRef.current) {
          transport.sendSnapshot({
            revision: revisionRef.current,
            state: stateRef.current,
          });
          return;
        }
        const validatedAction = adapter.validateAction(
          parsed.data.role,
          parsed.data.action
        );
        if (!validatedAction.success) return;
        const nextState = adapter.applyAction(stateRef.current, validatedAction.data);
        revisionRef.current += 1;
        stateRef.current = nextState;
        onRemoteState(nextState);
        transport.sendSnapshot({ revision: revisionRef.current, state: nextState });
      },
      onBootstrapRequest({ role: joiningRole }) {
        if (role !== "host" || joiningRole !== "participant") return;
        setParticipantState("connected");
        transport.sendSnapshot({
          revision: revisionRef.current,
          state: stateRef.current,
        });
      },
      onConnectionChange({ state }) {
        setStatus(state);
      },
      onPresence({ role: remoteRole, state }) {
        if (remoteRole === "participant" && role === "host") setParticipantState(state);
        if (remoteRole === "host" && role === "participant")
          setStatus(state === "connected" ? "connected" : "reconnecting");
      },
      onSessionEnded() {
        setStatus("ended");
      },
      onSnapshot({ snapshot }) {
        if (role !== "participant") return;
        const parsed = adapter.validateSnapshot(snapshot?.state);
        if (!parsed.success || !Number.isInteger(snapshot?.revision)) return;
        if (snapshot.revision < revisionRef.current) return;
        revisionRef.current = snapshot.revision;
        stateRef.current = parsed.data;
        onRemoteState(parsed.data);
        setStatus("connected");
      },
    });

    return () => {
      transport.disconnect();
      transportRef.current = null;
    };
  }, [adapter, onRemoteState, role, sessionId, transportFactory]);

  const publishState = useCallback(
    (nextState) => {
      if (!sessionId || !role || status === "ended") return;
      const snapshot = adapter.validateSnapshot(nextState);
      if (!snapshot.success) return;
      stateRef.current = snapshot.data;
      const transport = transportRef.current;
      if (!transport?.available) return;
      if (role === "host") {
        revisionRef.current += 1;
        transport.sendSnapshot({ revision: revisionRef.current, state: snapshot.data });
        return;
      }
      const action = adapter.createAction(snapshot.data);
      const validatedAction = adapter.validateAction("participant", action);
      if (!validatedAction.success) return;
      transport.sendAction({
        action: validatedAction.data,
        revision: revisionRef.current,
        role: "participant",
        sessionId,
      });
    },
    [adapter, role, sessionId, status]
  );

  const endSession = useCallback(() => {
    if (role !== "host") return;
    transportRef.current?.endSession();
    setStatus("ended");
    setParticipantState("disconnected");
  }, [role]);

  return {
    endSession,
    participantState,
    publishState,
    status,
  };
}
