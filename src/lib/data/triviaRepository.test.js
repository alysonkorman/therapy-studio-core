import { afterEach, describe, expect, it } from "vitest";

import { generalKnowledgeTrivia } from "../../data/resources";
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
});
