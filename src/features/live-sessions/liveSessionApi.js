import { roomCredentialSchema } from "./liveSessionProtocol";

const origin = () => import.meta.env.VITE_LIVE_SESSION_ORIGIN?.replace(/\/$/, "");

async function request(path, { body, token } = {}) {
  if (!origin()) throw new Error("unconfigured");
  const response = await fetch(`${origin()}${path}`, {
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    method: "POST",
  });
  if (!response.ok)
    throw new Error(response.status === 401 ? "unauthorized" : "unavailable");
  return response.json();
}

export async function createRemoteLiveSession({ state, token }) {
  return request("/live-sessions", {
    body: { activityKind: "whiteboard", state },
    token,
  });
}
export async function joinRemoteLiveSession({ capability, sessionId }) {
  const result = await request(`/live-sessions/${encodeURIComponent(sessionId)}/join`, {
    body: { capability },
  });
  return roomCredentialSchema.parse(result);
}
export async function getHostRoomCredential({ sessionId, token }) {
  return roomCredentialSchema.parse(
    await request(`/live-sessions/${encodeURIComponent(sessionId)}/host-token`, { token })
  );
}
export async function endRemoteLiveSession({ sessionId, token }) {
  return request(`/live-sessions/${encodeURIComponent(sessionId)}/end`, { token });
}
