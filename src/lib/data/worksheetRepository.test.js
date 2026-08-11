import { afterEach, describe, expect, it } from "vitest";

import { addWorksheetBlock } from "../../engines/worksheets/worksheetDocumentOperations";
import { createBlankWorksheetDocument, createWorksheetResource } from "../../models";
import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import { createTherapyStudioDatabase } from "./database";
import {
  createWorksheetRepository,
  WorksheetRepositoryError,
} from "./worksheetRepository";

const databases = [];

function setup() {
  const database = createTherapyStudioDatabase({
    name: `therapy-studio-test-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  });
  databases.push(database);
  let id = 0;
  const repository = createWorksheetRepository({
    database,
    createId: () => `generated-${++id}`,
    now: () => "2026-08-04T12:00:00.000Z",
  });
  return { database, repository };
}

function importedPair(id, title = `Imported ${id}`) {
  const now = "2026-08-08T12:00:00.000Z";
  return {
    resource: createWorksheetResource({ title }, { id, now }),
    document: createBlankWorksheetDocument(id, {
      createId: () => `${id}-page`,
      now,
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

describe("Worksheet repository", () => {
  it("creates Resource metadata and a document atomically", async () => {
    const { database, repository } = setup();
    const created = await repository.createWorksheet({
      title: "My Worksheet",
      starterId: "reflection",
    });

    expect(created.resource).toMatchObject({
      id: "generated-1",
      type: "worksheet",
      title: "My Worksheet",
    });
    expect(created.document.pages[0].blocks).toHaveLength(2);
    expect(await database.table("resources").count()).toBe(1);
    expect(await database.table("worksheetDocuments").count()).toBe(1);
  });

  it("saves and reopens a validated document with stable identity", async () => {
    const { repository } = setup();
    const created = await repository.createWorksheet({ title: "Saved" });
    const pageId = created.document.pages[0].id;
    const changed = addWorksheetBlock(created.document, pageId, "heading", () => "block");
    const saved = await repository.saveWorksheetDocument(created.resource.id, changed);
    const reopened = await repository.getWorksheetDocument(created.resource.id);

    expect(saved.pages[0].blocks[0].id).toBe("block");
    expect(reopened).toEqual(saved);
    expect(reopened.createdAt).toBe(created.document.createdAt);
  });

  it("saves a completed copy while leaving the reusable source unchanged", async () => {
    const { repository } = setup();
    const created = await repository.createWorksheet({ title: "Calm Plan" });
    const source = await repository.getWorksheetDocument(created.resource.id);
    const withResponseBlock = addWorksheetBlock(
      source,
      source.pages[0].id,
      "short-response",
      () => "response-block"
    );
    await repository.saveWorksheetDocument(created.resource.id, withResponseBlock);

    const completed = await repository.saveCompletedWorksheetCopy(created.resource.id, {
      "response-block": { text: "I asked for help." },
    });

    expect(completed.resource).toMatchObject({
      title: "Calm Plan — Completed Copy",
      provenance: `completed-from:${created.resource.id}`,
    });
    expect(completed.document.sessionResponses).toEqual({
      "response-block": { text: "I asked for help." },
    });
    expect(
      (await repository.getWorksheetDocument(created.resource.id)).sessionResponses
    ).toBeUndefined();
    expect(
      (await repository.getWorksheetDocument(completed.resource.id)).sessionResponses
    ).toEqual({ "response-block": { text: "I asked for help." } });
  });

  it("archives, restores, and permanently deletes a Worksheet and its document", async () => {
    const { database, repository } = setup();
    const created = await repository.createWorksheet({ title: "Lifecycle" });
    await repository.archiveWorksheet(created.resource.id);
    expect(
      (await repository.getAllWorksheets()).find(
        (worksheet) => worksheet.id === created.resource.id
      )
    ).toBeUndefined();
    expect(
      (await repository.getAllWorksheets({ includeArchived: true })).find(
        (worksheet) => worksheet.id === created.resource.id
      ).archived
    ).toBe(true);
    await repository.restoreWorksheet(created.resource.id);
    expect(
      (await repository.getAllWorksheets()).find(
        (worksheet) => worksheet.id === created.resource.id
      )
    ).toMatchObject({ id: created.resource.id, archived: false });
    await database.table("resourceMemory").put({
      resourceId: created.resource.id,
      favorite: true,
      rating: null,
      lastUsedAt: "2026-08-04T12:00:00.000Z",
      useCount: 1,
      therapistNotes: "Useful worksheet",
      worksWellWhen: "",
      kidsWhoUsuallyLikeThis: "",
      adaptations: "",
      createdAt: "2026-08-04T12:00:00.000Z",
      updatedAt: "2026-08-04T12:00:00.000Z",
    });
    await repository.deleteWorksheetPermanently(created.resource.id);
    expect(await database.table("resources").count()).toBe(0);
    expect(await database.table("worksheetDocuments").count()).toBe(0);
    expect(await database.table("resourceMemory").count()).toBe(0);
    await expect(repository.getWorksheetById(created.resource.id)).rejects.toMatchObject({
      code: "worksheet-not-found",
    });
  });

  it("duplicates a starter into an independent editable Worksheet", async () => {
    const { repository } = setup();
    const starterId = "worksheet-starter-worry-thermometer";
    const original = await repository.getWorksheetDocument(starterId);
    const duplicated = await repository.duplicateWorksheet(starterId);

    expect(duplicated.resource).toMatchObject({
      id: "generated-1",
      title: "My Worry Thermometer Copy",
      provenance: `duplicated-from:${starterId}`,
    });
    expect(duplicated.document.worksheetId).toBe("generated-1");
    expect(duplicated.document.pages[0].id).not.toBe(original.pages[0].id);
    expect(duplicated.document.pages[0].blocks[0].id).not.toBe(
      original.pages[0].blocks[0].id
    );

    const changed = addWorksheetBlock(
      duplicated.document,
      duplicated.document.pages[0].id,
      "heading",
      () => "copied-block"
    );
    await repository.saveWorksheetDocument(duplicated.resource.id, changed);
    expect((await repository.getWorksheetDocument(starterId)).pages).toEqual(
      original.pages
    );
  });

  it("protects starter originals while allowing copies to be archived", async () => {
    const { repository } = setup();
    const starterId = "worksheet-starter-thought-detective";
    const starterDocument = await repository.getWorksheetDocument(starterId);

    await expect(
      repository.saveWorksheetDocument(starterId, starterDocument)
    ).rejects.toMatchObject({ code: "protected-starter" });
    await expect(repository.archiveWorksheet(starterId)).rejects.toMatchObject({
      code: "protected-starter",
    });
    await expect(repository.deleteWorksheetPermanently(starterId)).rejects.toMatchObject({
      code: "protected-starter",
    });

    const copy = await repository.duplicateWorksheet(starterId);
    await repository.archiveWorksheet(copy.resource.id);
    expect(await repository.getWorksheetById(starterId)).toMatchObject({
      id: starterId,
      archived: false,
    });
  });

  it("rejects malformed documents without replacing stored content", async () => {
    const { repository } = setup();
    const created = await repository.createWorksheet({ title: "Safe" });

    await expect(
      repository.saveWorksheetDocument(created.resource.id, {
        ...created.document,
        pages: [],
      })
    ).rejects.toBeInstanceOf(WorksheetRepositoryError);
    expect(await repository.getWorksheetDocument(created.resource.id)).toEqual(
      created.document
    );
  });

  it("atomically imports single and bulk Worksheets as editable library records", async () => {
    const { database, repository } = setup();
    const pairs = [importedPair("import-one"), importedPair("import-two")];

    const imported = await repository.importWorksheets(pairs);

    expect(imported).toHaveLength(2);
    expect(await database.table("resources").count()).toBe(2);
    expect(await database.table("worksheetDocuments").count()).toBe(2);
    expect((await repository.getAllWorksheets()).map(({ id }) => id)).toEqual(
      expect.arrayContaining(["import-one", "import-two"])
    );

    const changed = addWorksheetBlock(
      await repository.getWorksheetDocument("import-one"),
      "import-one-page",
      "heading",
      () => "new-block"
    );
    await repository.saveWorksheetDocument("import-one", changed);
    expect(
      (await repository.getWorksheetDocument("import-one")).pages[0].blocks[0].id
    ).toBe("new-block");
  });

  it("rejects existing and protected IDs without partial writes", async () => {
    const { database, repository } = setup();
    await repository.importWorksheets([importedPair("existing")]);

    await expect(
      repository.importWorksheets([importedPair("new-record"), importedPair("existing")])
    ).rejects.toMatchObject({ code: "import-conflict" });
    expect(await database.table("resources").get("new-record")).toBeUndefined();
    expect(await database.table("worksheetDocuments").get("new-record")).toBeUndefined();

    await expect(
      repository.importWorksheets([importedPair("worksheet-starter-worry-thermometer")])
    ).rejects.toMatchObject({ code: "import-conflict" });
  });
});
