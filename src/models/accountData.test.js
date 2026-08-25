import { describe, expect, it } from "vitest";

import { accountDataContentId, projectAccountDataContent } from "./accountData";
import { recordToDeck } from "../lib/data/promptDeckRepositorySupport";

const timestamp = "2026-08-16T12:00:00.000Z";

function promptDeck(overrides = {}) {
  return {
    id: "deck-1",
    type: "prompt-deck",
    title: "Cloud-safe deck",
    createdAt: timestamp,
    updatedAt: timestamp,
    category: "CBT",
    color: "#6C46C3",
    iconId: "icon-1",
    prompts: [{ id: "prompt-1", text: "What helps?" }],
    ...overrides,
  };
}

describe("projectAccountDataContent", () => {
  it("preserves all supported Prompt deck and prompt fields through an Account Data round trip", () => {
    const deck = promptDeck({
      myNotes: "private therapist note",
      favorite: true,
      usageCount: 9,
      kidsWhoLike: ["A child"],
      diagnoses: ["deck diagnosis"],
      lastUsedAt: timestamp,
      rating: 4,
      useWith: ["family"],
      worksWellWhen: ["building rapport"],
      prompts: [
        {
          id: "prompt-1",
          text: "What helps?",
          diagnoses: ["client diagnosis"],
          legacyMetadata: {
            originalId: "legacy",
            artwork: null,
            attribution: null,
            provenance: {},
          },
        },
      ],
    });
    const projected = projectAccountDataContent("prompt-deck", deck);

    expect(projected).toEqual({
      archived: false,
      resource: expect.objectContaining({
        id: "deck-1",
        myNotes: "private therapist note",
        favorite: true,
        usageCount: 9,
        kidsWhoLike: ["A child"],
        diagnoses: ["deck diagnosis"],
        lastUsedAt: timestamp,
        rating: 4,
        useWith: ["family"],
        worksWellWhen: ["building rapport"],
        prompts: [expect.objectContaining({ diagnoses: ["client diagnosis"] })],
      }),
    });
    expect(projected.resource.prompts[0]).not.toHaveProperty("legacyMetadata");

    const reconstructed = recordToDeck({
      ...projected.resource,
      archived: projected.archived,
    });
    expect(reconstructed).toMatchObject({
      diagnoses: deck.diagnoses,
      favorite: deck.favorite,
      kidsWhoLike: deck.kidsWhoLike,
      lastUsedAt: deck.lastUsedAt,
      myNotes: deck.myNotes,
      rating: deck.rating,
      usageCount: deck.usageCount,
      useWith: deck.useWith,
      worksWellWhen: deck.worksWellWhen,
      prompts: [expect.objectContaining({ diagnoses: deck.prompts[0].diagnoses })],
    });
  });

  it("continues to project older Prompt records that omit the added fields", () => {
    const projected = projectAccountDataContent("prompt-deck", promptDeck());

    expect(projected.resource).toMatchObject({
      diagnoses: [],
      favorite: false,
      kidsWhoLike: [],
      lastUsedAt: null,
      myNotes: "",
      rating: null,
      usageCount: 0,
      useWith: [],
      worksWellWhen: [],
    });
    expect(projected.resource.prompts[0]).toMatchObject({ diagnoses: [] });
  });

  it("rejects unknown top-level content instead of silently uploading it", () => {
    expect(() =>
      projectAccountDataContent(
        "prompt-deck",
        promptDeck({ unapprovedSensitiveField: "must not persist" })
      )
    ).toThrow();
  });

  it("removes completed worksheet session responses from the cloud projection", () => {
    const content = projectAccountDataContent("worksheet", {
      resource: {
        id: "worksheet-1",
        type: "worksheet",
        title: "Reusable worksheet",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      document: {
        documentVersion: 1,
        worksheetId: "worksheet-1",
        createdAt: timestamp,
        updatedAt: timestamp,
        pages: [
          {
            id: "page-1",
            title: "",
            sortOrder: 0,
            settings: {},
            blocks: [
              { id: "block-1", sortOrder: 0, type: "short-response", prompt: "Name" },
            ],
          },
        ],
        sessionResponses: { "block-1": { text: "client response" } },
      },
    });

    expect(content.document).not.toHaveProperty("sessionResponses");
  });

  it("accepts a versioned Prompt Library reset preference without allowing extra data", () => {
    const preference = projectAccountDataContent("preference", {
      kind: "prompt-library-reset",
      phase: "complete",
      resetAt: timestamp,
      retiredStarterIds: ["starter-one", "starter-two"],
      version: 1,
    });

    expect(preference).toMatchObject({ kind: "prompt-library-reset", version: 1 });
    expect(accountDataContentId("preference", preference)).toBe("prompt-library-reset");
    expect(() =>
      projectAccountDataContent("preference", {
        ...preference,
        unexpected: "must not persist",
      })
    ).toThrow();
  });
});
