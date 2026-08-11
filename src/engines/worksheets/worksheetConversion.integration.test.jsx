import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import WorksheetDocumentRenderer from "../../features/worksheets/WorksheetDocumentRenderer";
import { createTherapyStudioDatabase } from "../../lib/data/database";
import { createWorksheetRepository } from "../../lib/data/worksheetRepository";
import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import { assembleSearchResources } from "../search/assembleSearchResources";
import {
  convertWorksheetText,
  createWorksheetPairFromConversion,
} from "./convertWorksheetDocument";

const databases = [];

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    })
  );
});

describe("converted Worksheet integration", () => {
  it("persists, reopens, renders, and participates in Resource search assembly", async () => {
    const database = createTherapyStudioDatabase({
      name: `worksheet-conversion-${crypto.randomUUID()}`,
      indexedDB,
      IDBKeyRange,
    });
    databases.push(database);
    const repository = createWorksheetRepository({ database });
    const ids = ["page-converted", "block-converted"];
    const pair = createWorksheetPairFromConversion(
      convertWorksheetText("Title: Converted Check-In\nHow are you today?"),
      {
        id: "worksheet-converted",
        createId: () => ids.shift(),
        now: "2026-08-11T12:00:00.000Z",
      }
    );

    await repository.importWorksheets([pair]);
    const reopenedResource = await repository.getWorksheetById(pair.resource.id);
    const reopenedDocument = await repository.getWorksheetDocument(pair.resource.id);

    expect(reopenedDocument).toEqual(pair.document);
    expect(
      assembleSearchResources([], [{ ...reopenedResource, archived: false }])
    ).toContainEqual(pair.resource);
    render(<WorksheetDocumentRenderer document={reopenedDocument} />);
    expect(screen.getByText("How are you today?")).toBeVisible();
  });
});
