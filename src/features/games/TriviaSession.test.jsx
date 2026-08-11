import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { generalKnowledgeTrivia } from "../../data/resources";
import TriviaSession from "./TriviaSession";

describe("TriviaSession", () => {
  it("reveals an answer and reports meaningful use only once", async () => {
    const user = userEvent.setup();
    const onMeaningfulUse = vi.fn();
    render(
      <TriviaSession game={generalKnowledgeTrivia} onMeaningfulUse={onMeaningfulUse} />
    );

    expect(screen.queryByRole("status")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Reveal Answer" }));
    expect(screen.getByRole("status")).toHaveTextContent("Mars");
    expect(onMeaningfulUse).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Reveal Answer" }));
    expect(onMeaningfulUse).toHaveBeenCalledTimes(1);
  });

  it("supports previous, next, stable shuffle, restart, and multiple-choice display", async () => {
    const user = userEvent.setup();
    render(<TriviaSession game={generalKnowledgeTrivia} random={() => 0} />);

    expect(screen.getByText("1 of 24")).toBeVisible();
    expect(screen.getByText("Venus")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("2 of 24")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("1 of 24")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Shuffle" }));
    expect(screen.getByText("1 of 24")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Restart" }));
    expect(screen.getByText("1 of 24")).toBeVisible();
  });

  it("supports practice, one-player, and two-team local scoring", async () => {
    const user = userEvent.setup();
    render(<TriviaSession game={generalKnowledgeTrivia} />);
    const scoring = screen.getByRole("combobox", { name: "Scoring" });

    expect(screen.queryByLabelText("Scores")).toBeNull();
    await user.selectOptions(scoring, "one");
    await user.click(screen.getByRole("button", { name: "Add point to Player" }));
    expect(screen.getByLabelText("Scores")).toHaveTextContent("Player1");
    await user.selectOptions(scoring, "two");
    expect(screen.getByText("Team 1")).toBeVisible();
    expect(screen.getByText("Team 2")).toBeVisible();
  });

  it("handles an empty set safely", () => {
    render(<TriviaSession game={{ ...generalKnowledgeTrivia, questions: [] }} />);
    expect(screen.getByRole("heading", { name: "No Questions Yet" })).toBeVisible();
  });
});
