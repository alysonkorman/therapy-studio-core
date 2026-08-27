import {
  participantRoomCredentialSchema,
  roomCredentialSchema,
} from "./liveSessionProtocol";

const origin = () => import.meta.env.VITE_LIVE_SESSION_ORIGIN?.replace(/\/$/, "");

export function participantUrlForActivity({ activityKind, participantUrl, siteOrigin }) {
  const url = new URL(participantUrl, siteOrigin);
  const fragment = new URLSearchParams(url.hash.slice(1));
  fragment.set("activity", activityKind);
  url.hash = fragment.toString();
  return url.toString();
}

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

export async function createRemoteLiveSession({
  activityKind = "whiteboard",
  state,
  token,
}) {
  return request("/live-sessions", {
    body: { activityKind, state },
    token,
  });
}
export async function joinRemoteLiveSession({
  capability,
  invitedActivityKind,
  sessionId,
}) {
  const result = await request(`/live-sessions/${encodeURIComponent(sessionId)}/join`, {
    body: { capability },
  });
  const credential = participantRoomCredentialSchema.parse(result);
  // Older deployed services may omit the activity kind. In that case use the
  // host-generated invite metadata; an activity kind from the service remains
  // authoritative whenever it is available.
  return {
    ...credential,
    activityKind: credential.activityKind ?? invitedActivityKind ?? "whiteboard",
  };
}
export async function getHostRoomCredential({ sessionId, token }) {
  return roomCredentialSchema.parse(
    await request(`/live-sessions/${encodeURIComponent(sessionId)}/host-token`, { token })
  );
}
export async function endRemoteLiveSession({ sessionId, token }) {
  return request(`/live-sessions/${encodeURIComponent(sessionId)}/end`, { token });
}
