import { describe, expect, it } from "vitest";

import {
  getPromptDeckPersistenceStatus,
  summarizePromptDeckPersistence,
} from "./promptDeckPersistenceStatus";

describe("Prompt deck persistence status", () => {
  it("keeps built-in decks distinct from account-owned and local decks", () => {
    expect(
      getPromptDeckPersistenceStatus({ builtIn: true, deck: { archived: false } })
    ).toBe("built-in");
    expect(
      getPromptDeckPersistenceStatus({ builtIn: true, deck: { archived: true } })
    ).toBe("retired-built-in");
    expect(getPromptDeckPersistenceStatus({ deck: {}, record: null })).toBe("local-only");
    expect(
      getPromptDeckPersistenceStatus({ deck: {}, record: { status: "saved" } })
    ).toBe("saved");
  });

  it("summarizes only real persistence states", () => {
    const decks = [
      { id: "starter" },
      { id: "synced" },
      { id: "local" },
      { id: "conflict" },
    ];
    const records = new Map([
      ["synced", { status: "saved" }],
      ["conflict", { status: "conflict" }],
    ]);

    expect(summarizePromptDeckPersistence(decks, records, new Set(["starter"]))).toEqual({
      builtIn: 1,
      conflicts: 1,
      localOnly: 1,
      synced: 1,
    });
  });
});
