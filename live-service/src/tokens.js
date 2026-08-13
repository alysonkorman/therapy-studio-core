/* global Buffer */
import { createHmac, timingSafeEqual } from "node:crypto";

function b64(value) {
  return Buffer.from(value).toString("base64url");
}
function unb64(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}
export function issueRoomCredential({ expiresAt, role, secret, sessionId }) {
  const payload = {
    exp: Math.floor(new Date(expiresAt).getTime() / 1000),
    role,
    sessionId,
    v: 1,
  };
  const encoded = b64(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}
export function verifyRoomCredential({ secret, token }) {
  const [encoded, signature] = String(token).split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", secret).update(encoded).digest("base64url");
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    return null;
  const payload = unb64(encoded);
  return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
}
