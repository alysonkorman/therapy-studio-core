import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { generalKnowledgeTrivia } from "../../data/resources";
import { renderWithRouter } from "../../test/test-utils";
import GamesPage from "./GamesPage";
import TriviaEditorPage from "./TriviaEditorPage";

const therapistGame = {
  ...generalKnowledgeTrivia,
  id: "my-trivia",
  title: "My Trivia",
  starter: false,
  questions: [
    {
      id: "question-1",
      question: "Original question?",
      answer: "Original answer",
      sortOrder: 0,
    },
  ],
};

describe("Trivia authoring", () => {
  it("creates a new therapist Trivia Set from the Games Library", async () => {
    const user = userEvent.setup();
    const created = { ...therapistGame, id: "created-trivia", title: "Ocean Trivia" };
    const repository = {
      createTriviaSet: vi.fn(async () => created),
      getAllTriviaSets: vi
        .fn()
        .mockResolvedValueOnce([{ ...generalKnowledgeTrivia, starter: true }])
        .mockResolvedValueOnce([{ ...generalKnowledgeTrivia, starter: true }, created]),
    };
    renderWithRouter(<GamesPage repository={repository} />);

    await user.click(screen.getByRole("button", { name: "New Trivia Set" }));
    await user.type(screen.getByRole("textbox", { name: "Title" }), "Ocean Trivia");
    await user.type(screen.getByRole("textbox", { name: "Category" }), "Ocean");
    expect(
      screen.getByRole("button", { name: /choose icon for trivia set icon/i })
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Create Trivia Set" }));

    expect(repository.createTriviaSet).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Ocean Trivia", category: "Ocean" })
    );
  });

  it("duplicates starters and permanently deletes therapist sets after confirmation", async () => {
    const user = userEvent.setup();
    const repository = {
      deleteTriviaSet: vi.fn(async () => {}),
      duplicateTriviaSet: vi.fn(async () => ({ ...therapistGame, id: "copy" })),
      getAllTriviaSets: vi.fn(async () => [
        { ...generalKnowledgeTrivia, starter: true },
        therapistGame,
      ]),
    };
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithRouter(<GamesPage repository={repository} />);

    await screen.findByRole("heading", { name: "My Trivia Sets" });
    await user.click(screen.getByRole("button", { name: "Duplicate to Edit" }));
    expect(repository.duplicateTriviaSet).toHaveBeenCalledWith(generalKnowledgeTrivia.id);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(window.confirm).toHaveBeenCalledWith(
      "Delete “My Trivia”? This cannot be undone."
    );
    expect(repository.deleteTriviaSet).toHaveBeenCalledWith(therapistGame.id);
  });

  it("adds, edits, duplicates, reorders, and deletes questions", async () => {
    const user = userEvent.setup();
    let stored = structuredClone(therapistGame);
    const repository = {
      getTriviaSetById: vi.fn(async () => stored),
      updateTriviaSet: vi.fn(async (id, changes) => {
        stored = { ...stored, ...changes };
        return stored;
      }),
    };
    renderWithRouter(
      <TriviaEditorPage gameId={therapistGame.id} repository={repository} />
    );

    await user.click(await screen.findByRole("button", { name: "Add Question" }));
    const addForm = screen.getByRole("button", { name: "Save Question" }).closest("form");
    await user.type(
      within(addForm).getByRole("textbox", { name: "Question" }),
      "New question?"
    );
    await user.type(within(addForm).getByRole("textbox", { name: "Answer" }), "Choice A");
    await user.selectOptions(
      within(addForm).getByRole("combobox", { name: "Question Type" }),
      "multiple"
    );
    await user.type(
      within(addForm).getByRole("textbox", { name: /choices/i }),
      "Choice A\nChoice B"
    );
    await user.click(within(addForm).getByRole("button", { name: "Save Question" }));
    expect(repository.updateTriviaSet).toHaveBeenLastCalledWith(
      therapistGame.id,
      expect.objectContaining({
        questions: expect.arrayContaining([
          expect.objectContaining({
            question: "New question?",
            choices: ["Choice A", "Choice B"],
          }),
        ]),
      })
    );

    await user.click(screen.getAllByRole("button", { name: "Duplicate" })[0]);
    expect(stored.questions).toHaveLength(3);
    await user.click(screen.getAllByRole("button", { name: "Move Down" })[0]);
    expect(stored.questions[1].question).toBe("Original question?");
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    expect(stored.questions).toHaveLength(2);
  });

  it("removes multiple-choice data when a question changes to open answer", async () => {
    const user = userEvent.setup();
    let stored = {
      ...structuredClone(therapistGame),
      questions: [
        {
          id: "question-1",
          question: "Pick one",
          answer: "First",
          choices: ["First", "Second"],
          sortOrder: 0,
        },
      ],
    };
    const repository = {
      getTriviaSetById: vi.fn(async () => stored),
      updateTriviaSet: vi.fn(async (id, changes) => {
        stored = { ...stored, ...changes };
        return stored;
      }),
    };
    renderWithRouter(
      <TriviaEditorPage gameId={therapistGame.id} repository={repository} />
    );

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    const editForm = screen
      .getByRole("button", { name: "Save Question" })
      .closest("form");
    await user.selectOptions(
      within(editForm).getByRole("combobox", { name: "Question Type" }),
      "open"
    );
    await user.click(within(editForm).getByRole("button", { name: "Save Question" }));

    expect(stored.questions[0]).not.toHaveProperty("choices");
    expect(stored.questions[0].id).toBe("question-1");
  });

  it("keeps starter sets protected from direct editing", async () => {
    renderWithRouter(
      <TriviaEditorPage
        gameId={generalKnowledgeTrivia.id}
        repository={{
          getTriviaSetById: vi.fn(async () => ({
            ...generalKnowledgeTrivia,
            starter: true,
          })),
        }}
      />
    );
    expect(
      await screen.findByRole("heading", { name: "Duplicate This Starter First" })
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Save Set Details" })).toBeNull();
  });
});
