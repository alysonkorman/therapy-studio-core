import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import { createTherapyStudioDatabase } from "../../lib/data/database";
import { createWorksheetRepository } from "../../lib/data/worksheetRepository";
import WorksheetsPage from "./WorksheetsPage";

const databases = [];

function setup() {
  const database = createTherapyStudioDatabase({
    name: `worksheet-template-ui-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  });
  databases.push(database);
  let id = 0;
  const repository = createWorksheetRepository({
    database,
    createId: () => `ui-template-${++id}`,
    now: () => "2026-08-11T12:00:00.000Z",
  });
  const router = createMemoryRouter(
    [
      { path: "/worksheets", element: <WorksheetsPage repository={repository} /> },
      { path: "/worksheets/:worksheetId/build", element: <p>Worksheet Builder</p> },
    ],
    { initialEntries: ["/worksheets"] }
  );
  return { repository, router };
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    })
  );
});

describe("Worksheet template library", () => {
  it("saves, displays, renames, and creates a Worksheet from My Templates", async () => {
    const { repository, router } = setup();
    const worksheet = await repository.createWorksheet({ title: "Feelings Map" });
    vi.spyOn(window, "prompt")
      .mockReturnValueOnce("My Feelings Template")
      .mockReturnValueOnce("Renamed Feelings Template")
      .mockReturnValueOnce("Friday Feelings Map");
    const user = userEvent.setup();
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "Feelings Map" });
    await user.click(screen.getByRole("button", { name: "Save as Template" }));
    expect(await screen.findByRole("heading", { name: "My Templates" })).toBeVisible();
    expect(screen.getByText("My Template")).toBeVisible();
    expect(screen.getByRole("heading", { name: "My Feelings Template" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Rename" }));
    expect(
      await screen.findByRole("heading", { name: "Renamed Feelings Template" })
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Use Template" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/^\/worksheets\/ui-template-/u);
    });
    expect(await screen.findByText("Worksheet Builder")).toBeVisible();
    expect(await repository.getWorksheetById(worksheet.resource.id)).toBeTruthy();
  });

  it("requires confirmation before deleting a personal template", async () => {
    const { repository, router } = setup();
    const worksheet = await repository.createWorksheet({ title: "Keep Source" });
    const template = await repository.saveAsTemplate(worksheet.resource.id, "Delete Me");
    const confirm = vi
      .spyOn(window, "confirm")
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const user = userEvent.setup();
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "Delete Me" });
    await user.click(screen.getByRole("button", { name: "Delete Template" }));
    expect(await repository.getWorksheetById(template.resource.id)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Delete Template" }));
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Delete Me" })).toBeNull();
    });
    expect(confirm).toHaveBeenLastCalledWith(
      "Delete template “Delete Me”? This cannot be undone."
    );
    await expect(repository.getWorksheetById(template.resource.id)).rejects.toMatchObject(
      {
        code: "worksheet-not-found",
      }
    );
  });
});
