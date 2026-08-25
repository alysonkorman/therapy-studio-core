import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";

import {
  promptCategorySchema,
  interventionGuidanceSchema,
  promptDeckSchema,
  promptPlaylistSchema,
  resourceMemorySchema,
  sessionProfileSchema,
  worksheetDocumentSchema,
  worksheetSchema,
  whiteboardDocumentSchema,
} from "../../models";
import { interventions } from "../../data/resources/interventions";
import { worksheetStarters } from "../../data/resources/worksheetStarters";
import {
  createTherapyStudioDatabase,
  THERAPY_STUDIO_DATABASE_LATEST_VERSION,
} from "./database";
import { createWorksheetRepository } from "./worksheetRepository";
import {
  backupErrorCodes,
  createBackupRepository,
  parseBackupJson,
  validateBackup,
} from "./backupRepository";

const databases = [];
const timestamp = "2026-08-09T12:00:00.000Z";

function createDatabase() {
  const database = createTherapyStudioDatabase({
    name: `backup-test-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  });
  databases.push(database);
  return database;
}

function baseResource(fields = {}) {
  return {
    id: "custom-intervention",
    type: "intervention",
    title: "Custom Intervention",
    description: "Therapist-created resource",
    tags: [],
    worksWellWhen: [],
    useWith: [],
    kidsWhoLike: [],
    goals: [],
    diagnoses: [],
    ageRanges: [],
    settings: [],
    materials: [],
    durationMinutes: null,
    telehealthFriendly: true,
    source: "",
    research: [],
    myNotes: "",
    rating: null,
    favorite: false,
    relatedResourceIds: [],
    usageCount: 0,
    lastUsedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...fields,
  };
}

function fixtures() {
  const deck = promptDeckSchema.parse({
    ...baseResource({
      id: "custom-deck",
      type: "prompt-deck",
      title: "My Deck",
    }),
    category: "Custom",
    color: "#663399",
    iconId: "emotions/happy",
    prompts: [{ id: "prompt-1", text: "What helped today?" }],
  });
  const worksheet = worksheetSchema.parse({
    ...baseResource({
      id: "custom-worksheet",
      type: "worksheet",
      title: "My Worksheet",
    }),
  });
  const intervention = baseResource();
  const guidance = interventionGuidanceSchema.parse({
    resourceId: intervention.id,
    overview: "Therapist-authored guidance",
    introduction: "Let’s begin.",
    steps: ["Take one step."],
    sourceStatus: "Reviewed source",
  });
  const document = worksheetDocumentSchema.parse({
    documentVersion: 1,
    worksheetId: worksheet.id,
    pages: [
      {
        id: "page-1",
        title: "Page 1",
        sortOrder: 0,
        settings: {},
        blocks: [{ id: "block-1", type: "paragraph", sortOrder: 0, text: "Edited text" }],
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const category = promptCategorySchema.parse({
    id: "category-1",
    name: "Custom",
    color: "#663399",
    iconId: "emotions/happy",
    sortOrder: 0,
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const playlist = promptPlaylistSchema.parse({
    id: "playlist-1",
    title: "Session Set",
    items: [{ id: "item-1", type: "prompt-deck", deckId: deck.id, sortOrder: 0 }],
    sortOrder: 0,
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const memory = resourceMemorySchema.parse({
    resourceId: deck.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    favorite: true,
    rating: 5,
    useCount: 3,
    lastUsedAt: timestamp,
    therapistNotes: "Private note\nwith line break",
    worksWellWhen: ["Low verbal"],
    kidsWhoUsuallyLikeThis: ["Minecraft"],
    adaptations: ["Use drawing"],
  });
  const profile = sessionProfileSchema.parse({
    id: "profile-1",
    displayName: "Blue Jay",
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const whiteboard = whiteboardDocumentSchema.parse({
    id: "whiteboard-1",
    documentVersion: 1,
    title: "Session Whiteboard",
    objects: [
      {
        id: "shape-1",
        kind: "rectangle",
        x: 40,
        y: 60,
        width: 180,
        height: 90,
        strokeColor: "#67529D",
        fillColor: "transparent",
        strokeWidth: 4,
      },
      {
        id: "arrow-1",
        kind: "arrow",
        x1: 30,
        y1: 40,
        x2: 220,
        y2: 160,
        strokeColor: "#28252C",
        strokeWidth: 3,
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return {
    deck,
    worksheet,
    intervention,
    guidance,
    document,
    category,
    playlist,
    memory,
    profile,
    whiteboard,
  };
}

async function seed(database) {
  const data = fixtures();
  await database.open();
  await database.table("resources").bulkAdd([
    { ...data.deck, archived: false },
    { ...data.worksheet, archived: true },
    { ...data.intervention, archived: false },
  ]);
  await database.table("categories").add(data.category);
  await database.table("playlists").add(data.playlist);
  await database.table("resourceMemory").add(data.memory);
  await database.table("sessionProfiles").add(data.profile);
  await database.table("worksheetDocuments").add(data.document);
  await database.table("interventionGuidance").add(data.guidance);
  await database.table("whiteboardDocuments").add(data.whiteboard);
  await database.table("localMediaAssets").add({
    id: "activity-asset",
    mimeType: "image/png",
    width: 640,
    height: 480,
    size: 4,
    accessibilityLabel: "Maze activity",
    createdAt: timestamp,
    data: new Uint8Array([1, 2, 3, 4]).buffer,
  });
  return data;
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()));
});

describe("backup repository", () => {
  it("exports a versioned, deterministic backup with all therapist-owned tables", async () => {
    const database = createDatabase();
    const data = await seed(database);
    const repository = createBackupRepository({ database, now: () => timestamp });

    const backup = await repository.exportBackup();

    expect(backup).toMatchObject({
      format: "therapy-studio-backup",
      version: 1,
      exportedAt: timestamp,
      databaseVersion: THERAPY_STUDIO_DATABASE_LATEST_VERSION,
    });
    expect(backup.data.resources.map(({ id }) => id)).toEqual([
      "custom-deck",
      "custom-intervention",
      "custom-worksheet",
    ]);
    expect(backup.data.resourceMemory[0]).toEqual(data.memory);
    expect(backup.data.sessionProfiles[0]).toEqual(data.profile);
    expect(backup.data.worksheetDocuments[0]).toEqual(data.document);
    expect(backup.data.interventionGuidance[0]).toEqual(data.guidance);
    expect(backup.data.whiteboardDocuments[0]).toEqual(data.whiteboard);
    expect(backup.data.localMediaAssets[0]).toMatchObject({
      id: "activity-asset",
      dataBase64: "AQIDBA==",
    });
    expect(backup.data.playlists[0].items[0].deckId).toBe(data.deck.id);
  });

  it("restores prompt authoring, private memory, profiles, and worksheet pairs", async () => {
    const source = createDatabase();
    await seed(source);
    const backup = await createBackupRepository({
      database: source,
      now: () => timestamp,
    }).exportBackup();
    const destination = createDatabase();
    await destination.open();
    await destination.table("resources").add({
      ...baseResource({ id: "replace-me" }),
      archived: false,
    });

    await createBackupRepository({ database: destination }).restoreBackup(backup);

    expect(await destination.table("resources").get("replace-me")).toBeUndefined();
    expect(await destination.table("resources").get("custom-deck")).toMatchObject({
      prompts: [{ id: "prompt-1", text: "What helped today?" }],
    });
    expect(await destination.table("categories").get("category-1")).toBeTruthy();
    expect(await destination.table("playlists").get("playlist-1")).toBeTruthy();
    expect(await destination.table("resourceMemory").get("custom-deck")).toMatchObject({
      therapistNotes: "Private note\nwith line break",
      adaptations: ["Use drawing"],
    });
    expect(await destination.table("sessionProfiles").get("profile-1")).toMatchObject({
      displayName: "Blue Jay",
    });
    expect(
      await destination.table("worksheetDocuments").get("custom-worksheet")
    ).toMatchObject({ pages: [{ blocks: [{ text: "Edited text" }] }] });
    expect(
      await destination.table("interventionGuidance").get("custom-intervention")
    ).toMatchObject({ overview: "Therapist-authored guidance" });
    expect(await destination.table("whiteboardDocuments").get("whiteboard-1")).toEqual(
      backup.data.whiteboardDocuments[0]
    );
    const media = await destination.table("localMediaAssets").get("activity-asset");
    expect(media).toMatchObject({ mimeType: "image/png", width: 640, height: 480 });
    expect([...new Uint8Array(media.data)]).toEqual([1, 2, 3, 4]);
  });

  it("exports and restores therapist-created Worksheet templates", async () => {
    const source = createDatabase();
    let id = 0;
    const worksheets = createWorksheetRepository({
      database: source,
      createId: () => `backup-template-${++id}`,
      now: () => timestamp,
    });
    const worksheet = await worksheets.createWorksheet({ title: "Source Worksheet" });
    const template = await worksheets.saveAsTemplate(
      worksheet.resource.id,
      "My Backup Template"
    );
    const backup = await createBackupRepository({
      database: source,
      now: () => timestamp,
    }).exportBackup();

    expect(backup.version).toBe(1);
    expect(backup.data.resources).toContainEqual(
      expect.objectContaining({
        id: template.resource.id,
        provenance: "therapist-template",
      })
    );
    expect(backup.data.worksheetDocuments).toContainEqual(
      expect.objectContaining({ worksheetId: template.resource.id })
    );

    const destination = createDatabase();
    await createBackupRepository({ database: destination }).restoreBackup(backup);
    const restored = createWorksheetRepository({ database: destination });
    expect(await restored.getWorksheetById(template.resource.id)).toMatchObject({
      title: "My Backup Template",
      provenance: "therapist-template",
    });
    expect(await restored.getWorksheetDocument(template.resource.id)).toEqual(
      template.document
    );
  });

  it("restores a representative freeform Worksheet with its complete visual layout", async () => {
    const source = createDatabase();
    const worksheets = createWorksheetRepository({
      database: source,
      createId: () => "freeform-worksheet",
      now: () => timestamp,
    });
    const created = await worksheets.createWorksheet({ title: "Brain Labels" });
    const [page] = created.document.pages;
    const freeform = {
      ...created.document,
      pages: [
        {
          ...page,
          layoutMode: "freeform",
          blocks: [
            {
              id: "background",
              type: "visual",
              iconId: "curated-culture-holidays-watarun01",
              label: "Brain diagram",
              decorative: true,
              size: "xl",
              alignment: "center",
              sortOrder: 0,
              layout: { x: 4, y: 4, width: 92, height: 92, zIndex: 0, locked: true },
            },
            {
              id: "label",
              type: "paragraph",
              text: "Amygdala",
              alignment: "left",
              sortOrder: 1,
              layout: { x: 18, y: 22, width: 26, height: 8, zIndex: 4, locked: false },
            },
            {
              id: "reflection",
              type: "reflection",
              title: "What do you notice?",
              instruction: "",
              lineCount: 2,
              sortOrder: 2,
              layout: { x: 12, y: 70, width: 62, height: 18, zIndex: 5, locked: false },
            },
            {
              id: "arrow",
              type: "line",
              strokeColor: "#6C46C3",
              strokeWidth: 5,
              arrowhead: true,
              label: "Look here",
              sortOrder: 3,
              layout: { x: 45, y: 34, width: 38, height: 9, zIndex: 6, locked: false },
            },
          ],
        },
      ],
    };
    await worksheets.saveWorksheetDocument(created.resource.id, freeform);

    const backup = await createBackupRepository({
      database: source,
      now: () => timestamp,
    }).exportBackup();
    const destination = createDatabase();
    await createBackupRepository({ database: destination }).restoreBackup(backup);
    const restored = createWorksheetRepository({ database: destination });

    expect(await restored.getWorksheetById(created.resource.id)).toMatchObject({
      id: created.resource.id,
      title: "Brain Labels",
    });
    expect(await restored.getWorksheetDocument(created.resource.id)).toEqual(freeform);
  });

  it("keeps deterministic built-in content available after replacing local tables", async () => {
    const database = createDatabase();
    await database.open();
    const emptyBackup = validateBackup({
      format: "therapy-studio-backup",
      version: 1,
      exportedAt: timestamp,
      data: {
        resources: [],
        categories: [],
        playlists: [],
        resourceMemory: [],
        sessionProfiles: [],
        worksheetDocuments: [],
      },
    });

    await createBackupRepository({ database }).restoreBackup(emptyBackup);

    expect(interventions.length).toBeGreaterThan(0);
    expect(await createWorksheetRepository({ database }).getAllWorksheets()).toHaveLength(
      worksheetStarters.length
    );
  });

  it.each([
    ["malformed JSON", "{", backupErrorCodes.invalidJson],
    ["unrelated JSON", "{}", backupErrorCodes.wrongFormat],
    [
      "unsupported future version",
      JSON.stringify({ format: "therapy-studio-backup", version: 99 }),
      backupErrorCodes.unsupportedVersion,
    ],
  ])("rejects %s", (_label, input, code) => {
    expect(() => parseBackupJson(input)).toThrow(expect.objectContaining({ code }));
  });

  it("rejects missing sections, invalid records, and duplicate Resource IDs", () => {
    const valid = {
      format: "therapy-studio-backup",
      version: 1,
      exportedAt: timestamp,
      data: {
        resources: [],
        categories: [],
        playlists: [],
        resourceMemory: [],
        sessionProfiles: [],
        worksheetDocuments: [],
      },
    };
    expect(() => validateBackup({ ...valid, data: {} })).toThrow(
      expect.objectContaining({ code: backupErrorCodes.invalidBackup })
    );
    expect(() =>
      validateBackup({
        ...valid,
        data: { ...valid.data, sessionProfiles: [{ id: "bad" }] },
      })
    ).toThrow(expect.objectContaining({ code: backupErrorCodes.invalidBackup }));
    const record = { ...baseResource(), archived: false };
    expect(() =>
      validateBackup({
        ...valid,
        data: { ...valid.data, resources: [record, record] },
      })
    ).toThrow(expect.objectContaining({ code: backupErrorCodes.duplicateId }));
  });

  it("rejects incomplete Worksheet pairs before changing local data", async () => {
    const database = createDatabase();
    await database.open();
    const existing = { ...baseResource({ id: "keep-me" }), archived: false };
    await database.table("resources").add(existing);
    const worksheet = fixtures().worksheet;
    const input = {
      format: "therapy-studio-backup",
      version: 1,
      exportedAt: timestamp,
      data: {
        resources: [{ ...worksheet, archived: false }],
        categories: [],
        playlists: [],
        resourceMemory: [],
        sessionProfiles: [],
        worksheetDocuments: [],
      },
    };

    await expect(
      createBackupRepository({ database }).restoreBackup(input)
    ).rejects.toMatchObject({ code: backupErrorCodes.worksheetMismatch });
    expect(await database.table("resources").get("keep-me")).toEqual(existing);
  });
});
