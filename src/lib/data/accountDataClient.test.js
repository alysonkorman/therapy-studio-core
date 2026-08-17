import { afterEach, describe, expect, it, vi } from "vitest";

import { AccountDataApiError, accountDataClient } from "./accountDataClient";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("Account Data client", () => {
  it("uses the configured API with a Cognito token and never sends an owner field", async () => {
    vi.stubEnv("VITE_ACCOUNT_DATA_ORIGIN", "https://account.example/");
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ records: [] }), { status: 200 }));

    await expect(accountDataClient.list({ token: "fake-id-token" })).resolves.toEqual({
      records: [],
    });
    expect(fetch).toHaveBeenCalledWith("https://account.example/account-data", {
      body: undefined,
      headers: {
        authorization: "Bearer fake-id-token",
        "content-type": "application/json",
      },
      method: "GET",
    });
  });

  it("surfaces revision conflicts without exposing response content", async () => {
    vi.stubEnv("VITE_ACCOUNT_DATA_ORIGIN", "https://account.example");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ code: "revision-conflict" }), { status: 409 })
    );

    await expect(
      accountDataClient.update({
        content: { test: "synthetic" },
        entityType: "prompt-deck",
        expectedRevision: 1,
        id: "deck-1",
        token: "fake-id-token",
      })
    ).rejects.toEqual(
      expect.objectContaining({ code: "revision-conflict", status: 409 })
    );
    await expect(accountDataClient.list({ token: null })).rejects.toBeInstanceOf(
      AccountDataApiError
    );
  });
});
