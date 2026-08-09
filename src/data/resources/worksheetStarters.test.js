import { describe, expect, it } from "vitest";

import { worksheetDocumentSchema, worksheetSchema } from "../../models";
import { searchResources } from "../../engines/search/searchResources";
import {
  getWorksheetStarterDocument,
  worksheetStarterDocuments,
  worksheetStarters,
} from "./worksheetStarters";

describe("Worksheet starter library", () => {
  it("contains ten valid Resources with stable unique IDs", () => {
    expect(worksheetStarters).toHaveLength(10);
    expect(new Set(worksheetStarters.map(({ id }) => id)).size).toBe(10);
    worksheetStarters.forEach((resource) => {
      expect(worksheetSchema.parse(resource)).toEqual(resource);
      expect(resource.id).toMatch(/^worksheet-starter-/);
      expect(resource.provenance).toBe("therapy-studio-starter");
      expect(resource.attribution).toBe("Therapy Studio original");
    });
  });

  it("contains a valid, matching document for every starter", () => {
    expect(Object.keys(worksheetStarterDocuments)).toHaveLength(10);
    worksheetStarters.forEach(({ id }) => {
      const document = getWorksheetStarterDocument(id);
      expect(worksheetDocumentSchema.parse(document)).toEqual(document);
      expect(document.worksheetId).toBe(id);
      expect(document.pages.some((page) => page.blocks.length > 0)).toBe(true);
    });
  });

  it("participates in the existing Resource search engine", () => {
    const [result] = searchResources(worksheetStarters, "worry thermometer");
    expect(result.resource).toMatchObject({
      id: "worksheet-starter-worry-thermometer",
      type: "worksheet",
    });
  });

  it("returns null for unknown starter documents", () => {
    expect(getWorksheetStarterDocument("missing")).toBeNull();
  });

  it("deep-freezes canonical starter metadata and document content", () => {
    const firstDocument = getWorksheetStarterDocument(worksheetStarters[0].id);
    expect(Object.isFrozen(worksheetStarters[0].tags)).toBe(true);
    expect(Object.isFrozen(firstDocument.pages)).toBe(true);
    expect(Object.isFrozen(firstDocument.pages[0].blocks)).toBe(true);
  });
});
