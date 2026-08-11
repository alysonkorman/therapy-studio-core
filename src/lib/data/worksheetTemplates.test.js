import { afterEach, describe, expect, it } from "vitest";

import { addWorksheetBlock } from "../../engines/worksheets/worksheetDocumentOperations";
import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import { createTherapyStudioDatabase } from "./database";
import { createWorksheetRepository } from "./worksheetRepository";

const databases = [];

function setup() {
  const database = createTherapyStudioDatabase({
    name: `worksheet-template-test-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  });
  databases.push(database);
  let id = 0;
  return {
    database,
    repository: createWorksheetRepository({
      database,
      createId: () => `template-id-${++id}`,
      now: () => "2026-08-11T12:00:00.000Z",
    }),
  };
}

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    })
  );
});

describe("therapist-created Worksheet templates", () => {
  it("copies a therapist Worksheet into an independent template with structured block data", async () => {
    const { repository } = setup();
    const original = await repository.createWorksheet({ title: "Calm Plan" });
    const pageId = original.document.pages[0].id;
    const document = addWorksheetBlock(
      original.document,
      pageId,
      "reflection",
      () => "reflection"
    );
    await repository.saveWorksheetDocument(original.resource.id, document);

    const template = await repository.saveAsTemplate(
      original.resource.id,
      "My Calm Plan"
    );

    expect(template.resource).toMatchObject({
      title: "My Calm Plan",
      provenance: "therapist-template",
    });
    expect(template.resource.id).not.toBe(original.resource.id);
    expect(template.document.worksheetId).toBe(template.resource.id);
    expect(template.document.pages[0].id).not.toBe(pageId);
    expect(template.document.pages[0].blocks.map(({ type }) => type)).toEqual([
      "reflection",
    ]);
    expect(await repository.getWorksheetDocument(original.resource.id)).toEqual(document);
  });

  it("creates an independent editable Worksheet without mutating or deleting its template", async () => {
    const { repository } = setup();
    const original = await repository.createWorksheet({ title: "Check In" });
    const template = await repository.saveAsTemplate(
      original.resource.id,
      "Check In Template"
    );
    const created = await repository.createWorksheetFromTemplate(
      template.resource.id,
      "Tuesday Check In"
    );

    expect(created.resource).toMatchObject({
      title: "Tuesday Check In",
      provenance: `created-from-template:${template.resource.id}`,
    });
    expect(created.resource.id).not.toBe(template.resource.id);
    expect(created.document.pages[0].id).not.toBe(template.document.pages[0].id);

    const changed = addWorksheetBlock(
      created.document,
      created.document.pages[0].id,
      "heading",
      () => "new-heading"
    );
    await repository.saveWorksheetDocument(created.resource.id, changed);
    expect(
      (await repository.getWorksheetDocument(template.resource.id)).pages[0].blocks
    ).toEqual(template.document.pages[0].blocks);

    await repository.deleteWorksheetPermanently(created.resource.id);
    expect(await repository.getWorksheetById(template.resource.id)).toMatchObject({
      provenance: "therapist-template",
    });
  });

  it("lists templates only when requested, renames them, and protects starters", async () => {
    const { repository } = setup();
    const original = await repository.createWorksheet({ title: "Original" });
    const template = await repository.saveAsTemplate(original.resource.id, "First Name");

    expect((await repository.getAllWorksheets()).map(({ id }) => id)).not.toContain(
      template.resource.id
    );
    expect(
      (await repository.getAllWorksheets({ includeTemplates: true })).map(({ id }) => id)
    ).toContain(template.resource.id);

    await repository.renameWorksheetTemplate(template.resource.id, "Renamed Template");
    expect(await repository.getWorksheetById(template.resource.id)).toMatchObject({
      title: "Renamed Template",
    });

    await expect(
      repository.saveAsTemplate("worksheet-starter-thought-detective")
    ).rejects.toMatchObject({ code: "protected-starter" });
    await expect(
      repository.createWorksheetFromTemplate(original.resource.id)
    ).rejects.toMatchObject({ code: "invalid-template" });
  });
});
