import { describe, expect, it } from "vitest";

import {
  parseWorksheetImportJson,
  validateWorksheetImport,
  WORKSHEET_IMPORT_FORMAT,
  WORKSHEET_IMPORT_VERSION,
} from "./importWorksheets";
import { createBlankWorksheetDocument, createWorksheetResource } from "../../models";

const now = "2026-08-09T12:00:00.000Z";

function pair(id = "worksheet-import-one", title = "Imported Worksheet") {
  return {
    resource: createWorksheetResource(
      { title, description: "Ready to edit" },
      { id, now }
    ),
    document: createBlankWorksheetDocument(id, {
      createId: () => `${id}-page`,
      now,
    }),
  };
}

function envelope(worksheets = [pair()]) {
  return {
    format: WORKSHEET_IMPORT_FORMAT,
    version: WORKSHEET_IMPORT_VERSION,
    worksheets,
  };
}

describe("Worksheet structured import validation", () => {
  it("validates single and bulk Resource/document pairs", () => {
    expect(validateWorksheetImport(envelope()).worksheets).toHaveLength(1);
    expect(
      validateWorksheetImport(envelope([pair("one", "One"), pair("two", "Two")]))
        .worksheets
    ).toHaveLength(2);
  });

  it("rejects malformed JSON, format, and version", () => {
    expect(() => parseWorksheetImportJson("{oops")).toThrow(/not valid JSON/i);
    expect(() => validateWorksheetImport({ ...envelope(), format: "other" })).toThrow(
      /invalid/i
    );
    expect(() => validateWorksheetImport({ ...envelope(), version: 2 })).toThrow(
      /invalid/i
    );
  });

  it("rejects invalid Resources, documents, and missing pairs", () => {
    expect(() =>
      validateWorksheetImport(
        envelope([{ ...pair(), resource: { ...pair().resource, type: "game" } }])
      )
    ).toThrow(/invalid/i);
    expect(() =>
      validateWorksheetImport(
        envelope([{ ...pair(), document: { ...pair().document, pages: [] } }])
      )
    ).toThrow(/invalid/i);
    expect(() =>
      validateWorksheetImport(envelope([{ resource: pair().resource }]))
    ).toThrow(/invalid/i);
  });

  it("rejects mismatched and duplicate Worksheet IDs", () => {
    expect(() =>
      validateWorksheetImport(
        envelope([{ ...pair(), document: { ...pair().document, worksheetId: "other" } }])
      )
    ).toThrow(/IDs must match/i);
    expect(() => validateWorksheetImport(envelope([pair(), pair()]))).toThrow(
      /Duplicate Worksheet ID/i
    );
  });
});
