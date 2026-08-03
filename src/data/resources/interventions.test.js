import { describe, expect, it, vi } from "vitest";

import { resourceSchema } from "../../models";
import { promptDecks } from "./promptDecks";

describe("intervention seeds", () => {
  it("keeps Feelings Jenga identity and timestamps stable across module reads", async () => {
    const firstRead = (await import("./interventions")).interventions[0];
    vi.resetModules();
    const secondRead = (await import("./interventions")).interventions[0];

    expect(firstRead.id).toBe("intervention-feelings-jenga");
    expect(secondRead.id).toBe(firstRead.id);
    expect(firstRead.createdAt).toBe("2026-08-01T02:45:27.000Z");
    expect(firstRead.updatedAt).toBe("2026-08-01T02:45:27.000Z");
    expect(secondRead.createdAt).toBe(firstRead.createdAt);
    expect(secondRead.updatedAt).toBe(firstRead.updatedAt);
  });

  it("validates the static intervention through the shared Resource schema", async () => {
    const intervention = (await import("./interventions")).interventions[0];

    expect(resourceSchema.parse(intervention)).toEqual(intervention);
  });

  it("does not change imported Prompt Deck IDs or data", async () => {
    const promptDeckSnapshot = structuredClone(promptDecks);
    const promptDeckIds = promptDecks.map((deck) => deck.id);

    await import("./interventions");

    expect(promptDecks.map((deck) => deck.id)).toEqual(promptDeckIds);
    expect(promptDecks).toEqual(promptDeckSnapshot);
  });
});
