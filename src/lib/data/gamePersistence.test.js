import { afterEach, describe, expect, it } from "vitest";

import { generalKnowledgeTrivia } from "../../data/resources";
import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import { createTherapyStudioDatabase } from "./database";
import { createResourceRepository } from "./resourceRepository";

const databases = [];
afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    })
  );
});

describe("Trivia Resource persistence", () => {
  it("stores and reopens a Trivia Set through the existing resources table", async () => {
    const database = createTherapyStudioDatabase({
      name: `therapy-studio-test-trivia-${crypto.randomUUID()}`,
      indexedDB,
      IDBKeyRange,
    });
    databases.push(database);
    const repository = createResourceRepository({ database });
    await repository.createResourceRecord(generalKnowledgeTrivia);
    const reopened = await repository.getResourceById(generalKnowledgeTrivia.id);
    expect(reopened.questions).toEqual(generalKnowledgeTrivia.questions);
    expect(reopened.gameKind).toBe("trivia");
  });
});
