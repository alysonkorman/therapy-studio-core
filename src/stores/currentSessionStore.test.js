import { beforeEach, describe, expect, it } from "vitest";

import {
  emptyCurrentSession,
  hasCurrentSessionContext,
  useCurrentSessionStore,
} from "./currentSessionStore";

describe("currentSessionStore", () => {
  beforeEach(() => useCurrentSessionStore.getState().clearContext());

  it("starts with a focused empty temporary context", () => {
    expect(useCurrentSessionStore.getState().context).toEqual(emptyCurrentSession);
    expect(hasCurrentSessionContext(useCurrentSessionStore.getState().context)).toBe(
      false
    );
  });

  it("updates one field and multiple fields", () => {
    useCurrentSessionStore.getState().updateField("goals", "rapport");
    useCurrentSessionStore.getState().updateContext({
      interests: "Pokémon",
      currentState: "shutting down",
    });

    expect(useCurrentSessionStore.getState().context).toMatchObject({
      goals: "rapport",
      interests: "Pokémon",
      currentState: "shutting down",
    });
    expect(hasCurrentSessionContext(useCurrentSessionStore.getState().context)).toBe(
      true
    );
  });

  it("rejects an unknown single field without adding it to context", () => {
    expect(() =>
      useCurrentSessionStore.getState().updateField("fullName", "Private Person")
    ).toThrow("Unknown Current Session field: fullName");
    expect(useCurrentSessionStore.getState().context).not.toHaveProperty("fullName");
  });

  it("rejects an unknown bulk field atomically", () => {
    expect(() =>
      useCurrentSessionStore.getState().updateContext({
        goals: "rapport",
        insurance: "not allowed",
      })
    ).toThrow("Unknown Current Session field: insurance");

    expect(useCurrentSessionStore.getState().context.goals).toBe("");
    expect(useCurrentSessionStore.getState().context).not.toHaveProperty("insurance");
  });

  it("retains state independently of component and route lifecycles", () => {
    useCurrentSessionStore.getState().updateField("strengths", "curious");
    const contextAfterNavigation = useCurrentSessionStore.getState().context;
    expect(contextAfterNavigation.strengths).toBe("curious");
  });

  it("clears every field", () => {
    useCurrentSessionStore.getState().updateContext({
      diagnoses: "ADHD",
      customNotes: "Offer choices",
    });
    useCurrentSessionStore.getState().clearContext();
    expect(useCurrentSessionStore.getState().context).toEqual(emptyCurrentSession);
  });

  it("does not define identifying, contact, insurance, or record fields", () => {
    expect(Object.keys(emptyCurrentSession)).not.toEqual(
      expect.arrayContaining([
        "fullName",
        "dateOfBirth",
        "address",
        "email",
        "phone",
        "insurance",
        "billing",
        "treatmentNotes",
      ])
    );
  });
});
