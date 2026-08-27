import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createProductionWebSocketTransport } from "./productionWebSocketTransport";
import {
  createRemoteLiveSession,
  endRemoteLiveSession,
  getHostRoomCredential,
} from "./liveSessionApi";
import {
  captureCognitoHostToken,
  consumePendingSharedSessionStart,
  getCognitoHostToken,
  hasConfiguredLiveSessionBackend,
  liveSessionLoginUrl,
  rememberPendingSharedSessionStart,
  rememberPostLoginPath,
} from "./liveSessionHostAuth";
import { initialSharedRoomState, sharedRoomAdapter } from "./sharedRoomAdapter";
import { useLiveSession } from "./useLiveSession";

const SharedSessionContext = createContext(null);
const storageKey = "therapy-studio:shared-live-session";

function readRememberedSession() {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || "null");
  } catch {
    return null;
  }
}

export function SharedSessionProvider({ children }) {
  const [session, setSession] = useState(readRememberedSession);
  const [credential, setCredential] = useState(null);
  const [error, setError] = useState("");
  const [room, setRoom] = useState(initialSharedRoomState);
  const transportFactory = useCallback(
    (options) => createProductionWebSocketTransport({ ...options, credential }),
    [credential]
  );
  const live = useLiveSession({
    adapter: sharedRoomAdapter,
    onRemoteState: setRoom,
    role: credential ? "host" : undefined,
    sessionId: credential?.sessionId,
    sharedState: room,
    transportFactory,
  });

  useEffect(() => {
    if (!session?.sessionId || !hasConfiguredLiveSessionBackend()) return;
    const token = getCognitoHostToken();
    if (!token) return;
    getHostRoomCredential({ sessionId: session.sessionId, token })
      .then(setCredential)
      .catch(() => {
        window.localStorage.removeItem(storageKey);
        setSession(null);
      });
  }, [session?.sessionId]);

  const start = useCallback(async () => {
    if (!hasConfiguredLiveSessionBackend()) {
      const message = "Live Sessions are not configured for this local app.";
      setError(message);
      throw new Error(message);
    }
    const token = captureCognitoHostToken();
    if (!token) {
      const login = liveSessionLoginUrl();
      if (login) {
        rememberPendingSharedSessionStart();
        rememberPostLoginPath(`${window.location.pathname}${window.location.search}`);
        window.location.assign(login);
        return null;
      }
      const message =
        "Live Sessions need sign-in, but the local sign-in connection is not configured.";
      setError(message);
      throw new Error(message);
    }
    let created;
    try {
      created = await createRemoteLiveSession({
        activityKind: "shared-room",
        state: initialSharedRoomState,
        token,
      });
    } catch (requestError) {
      if (requestError instanceof Error && requestError.message === "unauthorized") {
        const login = liveSessionLoginUrl();
        if (login) {
          rememberPendingSharedSessionStart();
          rememberPostLoginPath(`${window.location.pathname}${window.location.search}`);
          window.location.assign(login);
          return null;
        }
      }
      const message = "Live Session could not be started. Please try again.";
      setError(message);
      throw new Error(message);
    }
    const next = {
      participantUrl: new URL(created.participantUrl, window.location.origin).toString(),
      sessionId: created.id,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setSession(next);
    setCredential(await getHostRoomCredential({ sessionId: created.id, token }));
    setError("");
    return next;
  }, []);

  useEffect(() => {
    if (
      session ||
      !hasConfiguredLiveSessionBackend() ||
      !captureCognitoHostToken() ||
      !consumePendingSharedSessionStart()
    )
      return;
    void start().catch(() => {});
  }, [session, start]);

  const update = useCallback((action) => live.requestAction(action), [live]);
  const end = useCallback(async () => {
    if (credential)
      await endRemoteLiveSession({
        sessionId: credential.sessionId,
        token: getCognitoHostToken(),
      });
    window.localStorage.removeItem(storageKey);
    setCredential(null);
    setSession(null);
    setRoom(initialSharedRoomState);
  }, [credential]);

  const value = useMemo(
    () => ({
      end,
      error,
      room,
      session,
      start,
      status: live.status,
      participantState: live.participantState,
      update,
    }),
    [end, error, live.participantState, live.status, room, session, start, update]
  );
  return (
    <SharedSessionContext.Provider value={value}>
      {children}
    </SharedSessionContext.Provider>
  );
}

export function useSharedSession() {
  return useContext(SharedSessionContext);
}
