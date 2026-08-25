import { describe, expect, it } from "vitest";

import { pictureWordBingo } from "../../data/resources";
import { createResource, createWorksheetResource } from "../../models";
import {
  assembleSearchResources,
  validPersistedWorksheets,
} from "./assembleSearchResources";

const NOW = "2026-08-09T12:00:00.000Z";

describe("assembleSearchResources", () => {
  it("adds valid active Worksheet Resources without their archive wrapper", () => {
    const intervention = createResource({
      type: "intervention",
      title: "Feelings Jenga",
    });
    const worksheet = createWorksheetResource(
      { title: "Calm Plan" },
      { id: "worksheet-1", now: NOW }
    );

    expect(
      assembleSearchResources([intervention], [{ ...worksheet, archived: false }])
    ).toEqual([intervention, worksheet]);
  });

  it("omits archived and malformed Worksheet records", () => {
    const worksheet = createWorksheetResource(
      { title: "Calm Plan" },
      { id: "worksheet-1", now: NOW }
    );

    expect(
      validPersistedWorksheets([
        { ...worksheet, archived: true },
        { ...worksheet, id: "invalid", title: "" },
      ])
    ).toEqual([]);
  });

  it("deduplicates the same typed Resource deterministically", () => {
    const staticWorksheet = createWorksheetResource(
      { title: "Earlier Title" },
      { id: "worksheet-1", now: NOW }
    );
    const persistedWorksheet = {
      ...staticWorksheet,
      title: "Persisted Title",
      archived: false,
    };

    expect(assembleSearchResources([staticWorksheet], [persistedWorksheet])).toEqual([
      { ...staticWorksheet, title: "Persisted Title" },
    ]);
  });

  it("includes valid persisted Bingo Sets and rejects malformed Games", () => {
    const bingo = {
      ...pictureWordBingo,
      id: "persisted-bingo",
      title: "My Bingo",
      archived: false,
    };
    const malformed = { ...bingo, id: "broken-bingo", items: [] };

    expect(assembleSearchResources([], [], [], [bingo, malformed])).toEqual([
      expect.objectContaining({ id: "persisted-bingo", gameKind: "bingo" }),
    ]);
  });
});
