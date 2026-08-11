import { afterEach, describe, expect, it } from "vitest";

import { generalKnowledgeTrivia } from "../../data/resources";
import { searchResources } from "../../engines/search/searchResources";
import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import { createTherapyStudioDatabase } from "./database";
import { createResourceRepository } from "./resourceRepository";
import { createTriviaRepository, triviaRepositoryErrorCodes } from "./triviaRepository";

const databases = [];

function repository(ids = ["game-created", "question-copy"]) {
  const database = createTherapyStudioDatabase({
    name: `therapy-studio-test-trivia-authoring-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  });
  databases.push(database);
  const resourceRepository = createResourceRepository({
    database,
    now: () => "2026-08-12T13:00:00.000Z",
  });
  const idQueue = [...ids];
  return {
    database,
    resources: resourceRepository,
    repository: createTriviaRepository({
      resources: resourceRepository,
      createId: () => idQueue.shift() ?? crypto.randomUUID(),
      now: () => "2026-08-12T12:00:00.000Z",
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

describe("Trivia authoring repository", () => {
  it("creates, updates, and reopens a therapist Trivia Set", async () => {
    const { repository: trivia } = repository();
    const created = await trivia.createTriviaSet({ title: "My Trivia" });
    expect(created).toMatchObject({ id: "game-created", starter: false, questions: [] });

    await trivia.updateTriviaSet(created.id, {
      questions: [
        { id: "question-1", question: "Question?", answer: "Answer", sortOrder: 0 },
      ],
    });
    expect((await trivia.getTriviaSetById(created.id)).questions[0].id).toBe(
      "question-1"
    );
  });

  it("duplicates starters and therapist sets with new Resource and question IDs", async () => {
    const ids = [
      "copy-1",
      ...generalKnowledgeTrivia.questions.map((_, index) => `copy-q-${index}`),
    ];
    const { repository: trivia } = repository(ids);
    const copy = await trivia.duplicateTriviaSet(generalKnowledgeTrivia.id);

    expect(copy.id).toBe("copy-1");
    expect(copy.title).toBe(`${generalKnowledgeTrivia.title} Copy`);
    expect(copy.questions.map(({ id }) => id)).not.toEqual(
      generalKnowledgeTrivia.questions.map(({ id }) => id)
    );
    expect(generalKnowledgeTrivia.title).toBe("Curious Minds Trivia");
  });

  it("protects starters from editing and deletion", async () => {
    const { repository: trivia } = repository();
    await expect(
      trivia.updateTriviaSet(generalKnowledgeTrivia.id, { title: "Changed" })
    ).rejects.toMatchObject({ code: triviaRepositoryErrorCodes.protectedStarter });
    await expect(trivia.deleteTriviaSet(generalKnowledgeTrivia.id)).rejects.toMatchObject(
      {
        code: triviaRepositoryErrorCodes.protectedStarter,
      }
    );
  });

  it("permanently deletes a therapist set and its Resource Memory", async () => {
    const { database, repository: trivia } = repository();
    const created = await trivia.createTriviaSet({ title: "Temporary Trivia" });
    await database.table("resourceMemory").put({
      resourceId: created.id,
      favorite: true,
      rating: null,
      useCount: 0,
      lastUsedAt: null,
      therapistNotes: "",
      worksWellWhen: [],
      kidsWhoUsuallyLikeThis: [],
      adaptations: [],
      createdAt: "2026-08-12T12:00:00.000Z",
      updatedAt: "2026-08-12T12:00:00.000Z",
    });

    await trivia.deleteTriviaSet(created.id);
    expect(await database.table("resources").get(created.id)).toBeUndefined();
    expect(await database.table("resourceMemory").get(created.id)).toBeUndefined();
  });

  it("rejects malformed multiple-choice questions", async () => {
    const { repository: trivia } = repository();
    const created = await trivia.createTriviaSet({ title: "Invalid Trivia" });
    await expect(
      trivia.updateTriviaSet(created.id, {
        questions: [
          {
            id: "question-1",
            question: "Pick one",
            answer: "Missing",
            choices: ["First", "Second"],
            sortOrder: 0,
          },
        ],
      })
    ).rejects.toMatchObject({ code: triviaRepositoryErrorCodes.invalidTrivia });
  });

  it("imports single and bulk sets atomically and preserves complete data", async () => {
    const { repository: trivia, resources } = repository();
    const first = {
      ...structuredClone(generalKnowledgeTrivia),
      id: "imported-first",
      title: "Imported First",
      source: "Imported collection",
    };
    const second = {
      ...structuredClone(generalKnowledgeTrivia),
      id: "imported-second",
      title: "Imported Second",
    };

    const imported = await trivia.importTriviaSets([first, second]);
    expect(imported).toHaveLength(2);
    expect(await trivia.getTriviaSetById(first.id)).toMatchObject({
      source: "Imported collection",
      starter: false,
      questions: first.questions,
    });
    expect(
      searchResources(await resources.getAllResources(), "Imported First")[0].resource.id
    ).toBe(first.id);
  });

  it("round-trips a deleted therapist set with stable Resource and question IDs", async () => {
    const { repository: trivia } = repository();
    const created = await trivia.createTriviaSet({
      title: "Round Trip Trivia",
      questions: [
        {
          id: "stable-question",
          question: "Ready?",
          answer: "Yes",
          choices: ["Yes", "No"],
          explanation: "A preserved explanation",
          sortOrder: 0,
        },
      ],
    });
    const { starter, ...exported } = created;
    void starter;
    await trivia.deleteTriviaSet(created.id);
    await trivia.importTriviaSets([exported]);
    const reopened = await trivia.getTriviaSetById(created.id);
    expect(reopened.questions[0]).toMatchObject({
      id: "stable-question",
      choices: ["Yes", "No"],
      explanation: "A preserved explanation",
    });
    await expect(
      trivia.updateTriviaSet(created.id, { title: "Edited After Import" })
    ).resolves.toMatchObject({ title: "Edited After Import" });
  });

  it("rejects protected and stored ID conflicts without partially importing", async () => {
    const { database, repository: trivia } = repository();
    const existing = await trivia.createTriviaSet({ title: "Existing" });
    const newSet = {
      ...structuredClone(generalKnowledgeTrivia),
      id: "would-be-partial",
      title: "Should Not Import",
    };
    const existingConflict = { ...newSet, id: existing.id };

    await expect(
      trivia.importTriviaSets([newSet, existingConflict])
    ).rejects.toMatchObject({ code: triviaRepositoryErrorCodes.importConflict });
    expect(await database.table("resources").get(newSet.id)).toBeUndefined();
    await expect(trivia.importTriviaSets([generalKnowledgeTrivia])).rejects.toMatchObject(
      {
        code: triviaRepositoryErrorCodes.importConflict,
      }
    );
  });
});
