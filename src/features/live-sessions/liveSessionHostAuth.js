const hostTokenKey = "therapy-studio-live-session-host-token";
const pendingInviteKey = "therapy-studio-live-session-pending-invite";
const postLoginPathKey = "therapy-studio-post-login-path";

// Cognito Hosted UI returns this short-lived token in the fragment. It is held only
// for the browser session and immediately removed from the visible URL.
export function captureCognitoHostToken(
  location = window.location,
  history = window.history
) {
  const params = new URLSearchParams(location.hash.replace(/^#/, ""));
  const token = params.get("id_token");
  if (token) {
    sessionStorage.setItem(hostTokenKey, token);
    history.replaceState(null, "", `${location.pathname}${location.search}`);
  }
  return token ?? sessionStorage.getItem(hostTokenKey);
}
export function getCognitoHostToken() {
  return sessionStorage.getItem(hostTokenKey);
}
export function rememberPendingLiveSessionInvite() {
  sessionStorage.setItem(pendingInviteKey, "true");
}
export function hasPendingLiveSessionInvite() {
  return sessionStorage.getItem(pendingInviteKey) === "true";
}
export function consumePendingLiveSessionInvite() {
  const pending = hasPendingLiveSessionInvite();
  sessionStorage.removeItem(pendingInviteKey);
  return pending;
}
export function rememberPostLoginPath(pathname) {
  sessionStorage.setItem(postLoginPathKey, pathname);
}
export function consumePostLoginPath() {
  const pathname = sessionStorage.getItem(postLoginPathKey);
  sessionStorage.removeItem(postLoginPathKey);
  return pathname;
}
export function liveSessionLoginUrl() {
  return import.meta.env.VITE_COGNITO_LOGIN_URL || null;
}
export function hasConfiguredLiveSessionBackend() {
  return Boolean(import.meta.env.VITE_LIVE_SESSION_ORIGIN);
}
