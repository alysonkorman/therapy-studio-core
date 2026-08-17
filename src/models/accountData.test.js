import { describe, expect, it } from "vitest";

import { projectAccountDataContent } from "./accountData";

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
  it("projects prompt decks without local notes, memory, client associations, or usage", () => {
    const projected = projectAccountDataContent(
      "prompt-deck",
      promptDeck({
        myNotes: "private therapist note",
        favorite: true,
        usageCount: 9,
        kidsWhoLike: ["A child"],
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
      })
    );

    expect(projected).toEqual({
      archived: false,
      resource: expect.objectContaining({
        id: "deck-1",
        prompts: [expect.not.objectContaining({ diagnoses: expect.anything() })],
      }),
    });
    expect(projected.resource).not.toHaveProperty("myNotes");
    expect(projected.resource).not.toHaveProperty("favorite");
    expect(projected.resource).not.toHaveProperty("kidsWhoLike");
    expect(projected.resource.prompts[0]).not.toHaveProperty("legacyMetadata");
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
});
