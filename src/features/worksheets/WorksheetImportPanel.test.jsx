import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createBlankWorksheetDocument, createWorksheetResource } from "../../models";
import WorksheetImportPanel from "./WorksheetImportPanel";

const now = "2026-08-09T12:00:00.000Z";

function payload() {
  const resource = createWorksheetResource(
    { title: "Imported Coping Plan" },
    { id: "imported-coping-plan", now }
  );
  return {
    format: "therapy-studio-worksheets",
    version: 1,
    worksheets: [
      {
        resource,
        document: createBlankWorksheetDocument(resource.id, {
          createId: () => "imported-page",
          now,
        }),
      },
    ],
  };
}

function choose(input, name, text) {
  fireEvent.change(input, {
    target: { files: [{ name, text: vi.fn().mockResolvedValue(text) }] },
  });
}

describe("WorksheetImportPanel", () => {
  it("offers JSON and ordinary-document conversion paths", () => {
    render(
      <WorksheetImportPanel onCancel={vi.fn()} onImported={vi.fn()} repository={{}} />
    );
    expect(screen.getByLabelText("Worksheet JSON")).toBeVisible();
    expect(screen.getByRole("button", { name: "Paste Text" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Choose TXT" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Choose DOCX" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Choose PDF" })).toBeVisible();
  });

  it("previews and confirms a validated Worksheet import", async () => {
    const user = userEvent.setup();
    const repository = {
      importWorksheets: vi.fn(async (pairs) => pairs),
    };
    const onImported = vi.fn().mockResolvedValue(undefined);
    render(
      <WorksheetImportPanel
        onCancel={vi.fn()}
        onImported={onImported}
        repository={repository}
      />
    );

    choose(
      screen.getByLabelText("Worksheet JSON"),
      "worksheets.json",
      JSON.stringify(payload())
    );

    expect(await screen.findByText("1 Worksheet ready to import.")).toBeVisible();
    expect(screen.getByText("Imported Coping Plan")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Confirm Import" }));
    expect(repository.importWorksheets).toHaveBeenCalledWith(payload().worksheets);
    expect(onImported).toHaveBeenCalledOnce();
    expect(
      await screen.findByText("1 Worksheet was imported successfully.")
    ).toBeVisible();
  });

  it("shows useful errors for malformed JSON and non-JSON files", async () => {
    render(
      <WorksheetImportPanel
        onCancel={vi.fn()}
        onImported={vi.fn()}
        repository={{ importWorksheets: vi.fn() }}
      />
    );
    const input = screen.getByLabelText("Worksheet JSON");

    choose(input, "notes.txt", "{}");
    expect(await screen.findByRole("alert")).toHaveTextContent(/choose a .json/i);

    choose(input, "broken.json", "{oops");
    expect(await screen.findByRole("alert")).toHaveTextContent(/not valid JSON/i);
    expect(screen.getByRole("button", { name: "Confirm Import" })).toBeDisabled();
  });
});
