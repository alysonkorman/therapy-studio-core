import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { generalKnowledgeTrivia } from "../../data/resources";
import TriviaImportPanel from "./TriviaImportPanel";

const payload = {
  format: "therapy-studio-trivia",
  version: 1,
  sets: [
    {
      ...generalKnowledgeTrivia,
      id: "imported-trivia",
      title: "Imported Ocean Trivia",
    },
  ],
};

function choose(input, name, text) {
  fireEvent.change(input, {
    target: { files: [{ name, text: vi.fn().mockResolvedValue(text) }] },
  });
}

describe("TriviaImportPanel", () => {
  it("previews and confirms a completely validated import", async () => {
    const user = userEvent.setup();
    const repository = { importTriviaSets: vi.fn(async (sets) => sets) };
    const onImported = vi.fn().mockResolvedValue(undefined);
    render(
      <TriviaImportPanel
        onClose={vi.fn()}
        onImported={onImported}
        repository={repository}
      />
    );

    choose(screen.getByLabelText("Trivia JSON"), "trivia.json", JSON.stringify(payload));
    expect(await screen.findByText("1 Trivia Set ready to import.")).toBeVisible();
    expect(screen.getByText("Imported Ocean Trivia")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Confirm Import" }));
    expect(repository.importTriviaSets).toHaveBeenCalledWith(payload.sets);
    expect(onImported).toHaveBeenCalledOnce();
    expect(
      await screen.findByText("1 Trivia Set was imported successfully.")
    ).toBeVisible();
  });

  it("rejects malformed JSON and non-JSON files before persistence", async () => {
    const repository = { importTriviaSets: vi.fn() };
    render(
      <TriviaImportPanel onClose={vi.fn()} onImported={vi.fn()} repository={repository} />
    );
    const input = screen.getByLabelText("Trivia JSON");
    choose(input, "trivia.txt", "{}");
    expect(await screen.findByRole("alert")).toHaveTextContent(/choose a .json/i);
    choose(input, "broken.json", "{oops");
    expect(await screen.findByRole("alert")).toHaveTextContent(/not valid json/i);
    expect(repository.importTriviaSets).not.toHaveBeenCalled();
  });
});
