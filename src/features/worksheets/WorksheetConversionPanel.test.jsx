import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import WorksheetConversionPanel from "./WorksheetConversionPanel";

const source = `
Title: Daily Check-In
Instructions: Think about today.
FIRST QUESTION
What went well?
____
SECOND QUESTION
What would you try next time?
____
Source: Synthetic therapist-created material
`;

async function reachReview(repository, onImported = vi.fn()) {
  const user = userEvent.setup();
  render(
    <WorksheetConversionPanel
      mode="paste"
      onImported={onImported}
      repository={repository}
    />
  );
  await user.type(screen.getByRole("textbox", { name: "Worksheet text" }), source);
  await user.click(screen.getByRole("button", { name: "Review Conversion" }));
  return { user, onImported };
}

describe("WorksheetConversionPanel", () => {
  it("allows review edits, movement, deletion, and confirmed atomic import", async () => {
    const repository = { importWorksheets: vi.fn(async (pairs) => pairs) };
    const { user, onImported } = await reachReview(repository);

    await user.clear(screen.getByRole("textbox", { name: "Worksheet title" }));
    await user.type(
      screen.getByRole("textbox", { name: "Worksheet title" }),
      "Edited Daily Check-In"
    );
    const blocks = screen.getAllByRole("article");
    await user.click(
      within(blocks[1]).getByRole("button", { name: /move block 2 down/i })
    );
    await user.click(screen.getByRole("button", { name: /delete block 1/i }));
    await user.click(screen.getByRole("button", { name: "Confirm Import" }));

    expect(repository.importWorksheets).toHaveBeenCalledTimes(1);
    const [[pairs]] = repository.importWorksheets.mock.calls;
    expect(pairs[0].resource.title).toBe("Edited Daily Check-In");
    expect(pairs[0].document.pages[0].blocks).toHaveLength(blocks.length - 1);
    expect(onImported).toHaveBeenCalled();
  });

  it("allows a safe generic block type change", async () => {
    const { user } = await reachReview({ importWorksheets: vi.fn() });
    const firstType = screen.getAllByRole("combobox", { name: "Block type" })[0];
    await user.selectOptions(firstType, "paragraph");
    expect(firstType).toHaveValue("paragraph");
  });

  it("writes nothing when conversion is cancelled", async () => {
    const repository = { importWorksheets: vi.fn() };
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(
      <WorksheetConversionPanel mode="paste" onBack={onBack} repository={repository} />
    );
    await user.type(screen.getByRole("textbox", { name: "Worksheet text" }), source);
    await user.click(screen.getByRole("button", { name: "Review Conversion" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onBack).toHaveBeenCalled();
    expect(repository.importWorksheets).not.toHaveBeenCalled();
  });
});
