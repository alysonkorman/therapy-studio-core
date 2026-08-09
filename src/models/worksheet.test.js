import { describe, expect, it } from "vitest";

import { createWorksheetResource, worksheetSchema } from "./worksheet";

describe("Worksheet Resource", () => {
  it("creates a strict editable Worksheet Resource", () => {
    const worksheet = createWorksheetResource(
      { title: "Feelings Map", category: "Emotions" },
      { id: "worksheet-1", now: "2026-08-04T12:00:00.000Z" }
    );

    expect(worksheet).toMatchObject({
      id: "worksheet-1",
      type: "worksheet",
      title: "Feelings Map",
      category: "Emotions",
      format: "editable",
    });
    expect(worksheet.createdAt).toBe("2026-08-04T12:00:00.000Z");
  });

  it("rejects unknown fields and unsafe colors", () => {
    const valid = createWorksheetResource(
      { title: "Safe" },
      { id: "worksheet-1", now: "2026-08-04T12:00:00.000Z" }
    );
    expect(() => worksheetSchema.parse({ ...valid, surprise: true })).toThrow();
    expect(() => worksheetSchema.parse({ ...valid, color: "red" })).toThrow();
  });
});
