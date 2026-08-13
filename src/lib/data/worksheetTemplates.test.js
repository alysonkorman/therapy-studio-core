import { afterEach, describe, expect, it } from "vitest";

import {
  addWorksheetBlock,
  updateWorksheetBlock,
} from "../../engines/worksheets/worksheetDocumentOperations";
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
  it("copies a therapist Worksheet into an independent template with all block data", async () => {
    const { repository } = setup();
    const original = await repository.createWorksheet({ title: "Calm Plan" });
    const pageId = original.document.pages[0].id;
    let document = addWorksheetBlock(original.document, pageId, "visual", () => "visual");
    document = updateWorksheetBlock(document, pageId, "visual", {
      iconId: "curated-culture-holidays-watarun01",
      label: "Temple",
    });
    document = addWorksheetBlock(document, pageId, "reflection", () => "reflection");
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
      "visual",
      "reflection",
    ]);
    expect(template.document.pages[0].blocks[0]).toMatchObject({
      iconId: "curated-culture-holidays-watarun01",
      label: "Temple",
    });
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

  it("preserves freeform geometry in templates while regenerating document identities", async () => {
    const { repository } = setup();
    const original = await repository.createWorksheet({ title: "Freeform Source" });
    const [page] = original.document.pages;
    const source = {
      ...original.document,
      pages: [
        {
          ...page,
          layoutMode: "freeform",
          blocks: [
            {
              id: "source-arrow",
              type: "line",
              strokeColor: "#6C46C3",
              strokeWidth: 4,
              arrowhead: true,
              label: "Follow this",
              sortOrder: 0,
              layout: { x: 25, y: 30, width: 45, height: 8, zIndex: 3, locked: true },
            },
          ],
        },
      ],
    };
    await repository.saveWorksheetDocument(original.resource.id, source);

    const template = await repository.saveAsTemplate(
      original.resource.id,
      "Freeform Template"
    );
    const created = await repository.createWorksheetFromTemplate(
      template.resource.id,
      "Freeform Copy"
    );
    const templateBlock = template.document.pages[0].blocks[0];
    const createdBlock = created.document.pages[0].blocks[0];

    expect(template.document.pages[0].layoutMode).toBe("freeform");
    expect(created.document.pages[0].layoutMode).toBe("freeform");
    expect(createdBlock.id).not.toBe(templateBlock.id);
    expect(createdBlock).toMatchObject({
      arrowhead: true,
      label: "Follow this",
      layout: { x: 25, y: 30, width: 45, height: 8, zIndex: 3, locked: true },
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
