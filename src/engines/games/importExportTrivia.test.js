import { describe, expect, it } from "vitest";

import { generalKnowledgeTrivia } from "../../data/resources";
import {
  createTriviaExport,
  createTriviaExportJson,
  parseTriviaImportJson,
  triviaExportFilename,
  validateTriviaImport,
} from "./importExportTrivia";

const set = (id = "trivia-import-one", title = "Imported Trivia") => ({
  ...structuredClone(generalKnowledgeTrivia),
  id,
  title,
  source: "Alyson's collection",
});

const envelope = (sets = [set()]) => ({
  format: "therapy-studio-trivia",
  version: 1,
  sets,
});

describe("Trivia JSON import and export", () => {
  it("validates complete single and bulk imports", () => {
    expect(validateTriviaImport(envelope()).sets).toHaveLength(1);
    expect(
      validateTriviaImport(envelope([set("first"), set("second")])).sets
    ).toHaveLength(2);
  });

  it("exports the complete validated Resource using format version 1", () => {
    const exported = createTriviaExport({ ...set(), starter: false });
    expect(exported).toEqual(envelope());
    expect(exported.sets[0].questions).toEqual(set().questions);
    expect(exported.sets[0]).not.toHaveProperty("starter");
    expect(parseTriviaImportJson(createTriviaExportJson(set()))).toEqual(exported);
    expect(triviaExportFilename("Ocean & Space!")).toBe(
      "therapy-studio-trivia-ocean-space.json"
    );
  });

  it("rejects malformed JSON, format, and version", () => {
    expect(() => parseTriviaImportJson("{oops")).toThrow(/not valid JSON/i);
    expect(() => validateTriviaImport({ ...envelope(), format: "other" })).toThrow(
      /invalid/i
    );
    expect(() => validateTriviaImport({ ...envelope(), version: 2 })).toThrow(/invalid/i);
  });

  it("rejects duplicate set and question IDs and malformed choices", () => {
    expect(() => validateTriviaImport(envelope([set(), set()]))).toThrow(
      /duplicate trivia set id/i
    );
    const duplicateQuestions = set();
    duplicateQuestions.questions[1].id = duplicateQuestions.questions[0].id;
    expect(() => validateTriviaImport(envelope([duplicateQuestions]))).toThrow(
      /duplicate trivia question id/i
    );
    const invalidChoices = set();
    invalidChoices.questions[0].answer = "Not a choice";
    expect(() => validateTriviaImport(envelope([invalidChoices]))).toThrow(
      /intended answer/i
    );
  });
});
