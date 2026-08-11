import { describe, expect, it } from "vitest";

import { triviaGameSchema } from "../../models/game";
import { generalKnowledgeTrivia, triviaSets } from "./triviaSets";

describe("Trivia starter content", () => {
  it("provides one valid, original, playable starter set", () => {
    expect(triviaSets).toHaveLength(1);
    expect(triviaGameSchema.parse(generalKnowledgeTrivia)).toEqual(
      generalKnowledgeTrivia
    );
    expect(generalKnowledgeTrivia.questions).toHaveLength(24);
    expect(generalKnowledgeTrivia.source).toBe("Original Therapy Studio content");
    expect(generalKnowledgeTrivia.questions.some(({ choices }) => choices)).toBe(true);
    expect(generalKnowledgeTrivia.questions.some(({ choices }) => !choices)).toBe(true);
  });
});
