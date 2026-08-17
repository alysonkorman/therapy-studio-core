import { accountDataEntityTypeSchema } from "../../models/accountData";
import { getCognitoHostToken } from "../../features/live-sessions/liveSessionHostAuth";

export class AccountDataApiError extends Error {
  constructor(code, status) {
    super(code);
    this.name = "AccountDataApiError";
    this.code = code;
    this.status = status;
  }
}

function origin() {
  return import.meta.env.VITE_ACCOUNT_DATA_ORIGIN?.replace(/\/$/u, "") ?? "";
}

export function hasConfiguredAccountData() {
  return Boolean(origin());
}

async function request(
  path,
  { body, method = "GET", token = getCognitoHostToken() } = {}
) {
  if (!origin()) throw new AccountDataApiError("unconfigured", 0);
  if (!token) throw new AccountDataApiError("unauthenticated", 401);

  let response;
  try {
    response = await fetch(`${origin()}${path}`, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      method,
    });
  } catch {
    throw new AccountDataApiError("network", 0);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new AccountDataApiError(payload.code ?? "unavailable", response.status);
  return payload;
}

export const accountDataClient = Object.freeze({
  list: ({ token } = {}) => request("/account-data", { token }),
  fetch: ({ entityType, id, token }) =>
    request(
      `/account-data/${encodeURIComponent(accountDataEntityTypeSchema.parse(entityType))}/${encodeURIComponent(id)}`,
      { token }
    ),
  create: ({ content, entityType, id, idempotencyId, token }) =>
    request("/account-data", {
      body: { content, entityType, id, idempotencyId },
      method: "POST",
      token,
    }),
  update: ({ content, entityType, expectedRevision, id, idempotencyId, token }) =>
    request(
      `/account-data/${encodeURIComponent(accountDataEntityTypeSchema.parse(entityType))}/${encodeURIComponent(id)}`,
      { body: { content, expectedRevision, idempotencyId }, method: "PUT", token }
    ),
  tombstone: ({ entityType, expectedRevision, id, idempotencyId, token }) =>
    request(
      `/account-data/${encodeURIComponent(accountDataEntityTypeSchema.parse(entityType))}/${encodeURIComponent(id)}`,
      { body: { expectedRevision, idempotencyId }, method: "DELETE", token }
    ),
});
