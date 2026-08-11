import { describe, expect, it } from "vitest";

import { triviaGameSchema, triviaQuestionSchema } from "./game";

const baseGame = {
  id: "game-1",
  type: "game",
  gameKind: "trivia",
  title: "Animal Trivia",
  description: "Friendly animal questions.",
  tags: [],
  worksWellWhen: [],
  useWith: [],
  kidsWhoLike: [],
  goals: [],
  diagnoses: [],
  ageRanges: [],
  settings: [],
  materials: [],
  durationMinutes: 15,
  telehealthFriendly: true,
  source: "Therapy Studio",
  research: [],
  myNotes: "",
  rating: null,
  favorite: false,
  relatedResourceIds: [],
  usageCount: 0,
  lastUsedAt: null,
  createdAt: "2026-08-11T12:00:00.000Z",
  updatedAt: "2026-08-11T12:00:00.000Z",
  contentVersion: 1,
  questions: [
    { id: "q-2", question: "Second?", answer: "Yes", sortOrder: 1 },
    { id: "q-1", question: "First?", answer: "Yes", sortOrder: 0 },
  ],
};

describe("Trivia models", () => {
  it("validates open and multiple-choice questions", () => {
    expect(
      triviaQuestionSchema.parse({
        id: "q-1",
        question: "Which planet is known as the Red Planet?",
        answer: "Mars",
        choices: ["Mars", "Venus", "Jupiter"],
        sortOrder: 0,
      })
    ).toMatchObject({ answer: "Mars", choices: ["Mars", "Venus", "Jupiter"] });
  });

  it("rejects empty question and answer text", () => {
    expect(() =>
      triviaQuestionSchema.parse({ id: "q", question: " ", answer: " ", sortOrder: 0 })
    ).toThrow();
  });

  it("rejects duplicate IDs and returns deterministic question order", () => {
    expect(triviaGameSchema.parse(baseGame).questions.map(({ id }) => id)).toEqual([
      "q-1",
      "q-2",
    ]);
    expect(() =>
      triviaGameSchema.parse({
        ...baseGame,
        questions: [baseGame.questions[0], { ...baseGame.questions[1], id: "q-2" }],
      })
    ).toThrow(/Duplicate Trivia question ID/);
  });
});
