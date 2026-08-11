import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createBlankWorksheetDocument, createWorksheetResource } from "../../models";
import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import { createTherapyStudioDatabase } from "../../lib/data/database";
import { createWorksheetRepository } from "../../lib/data/worksheetRepository";
import WorksheetBuilderPage from "./WorksheetBuilderPage";
import WorksheetDetailPage from "./WorksheetDetailPage";
import WorksheetPreviewPage from "./WorksheetPreviewPage";
import WorksheetSessionPage from "./WorksheetSessionPage";
import WorksheetsPage from "./WorksheetsPage";

const databases = [];

function realRepository() {
  const database = createTherapyStudioDatabase({
    name: `therapy-studio-test-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  });
  databases.push(database);
  let id = 0;
  return createWorksheetRepository({
    database,
    createId: () => `route-id-${++id}`,
    now: () => "2026-08-04T12:00:00.000Z",
  });
}

function renderRoutes(repository, initialEntry = "/worksheets") {
  const router = createMemoryRouter(
    [
      { path: "/worksheets", element: <WorksheetsPage repository={repository} /> },
      {
        path: "/worksheets/:worksheetId",
        element: <WorksheetDetailPage repository={repository} />,
      },
      {
        path: "/worksheets/:worksheetId/build",
        element: <WorksheetBuilderPage repository={repository} />,
      },
      {
        path: "/worksheets/:worksheetId/preview",
        element: <WorksheetPreviewPage repository={repository} />,
      },
      {
        path: "/worksheets/:worksheetId/session",
        element: <WorksheetSessionPage repository={repository} />,
      },
    ],
    { initialEntries: [initialEntry] }
  );
  render(<RouterProvider router={router} />);
  return router;
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

describe("routed Worksheet workflow", () => {
  it("creates, builds, saves, reopens, and previews a persisted Worksheet", async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const repository = realRepository();
    const router = renderRoutes(repository);

    expect(
      await screen.findByRole("heading", { name: "Worksheets" })
    ).toBeInTheDocument();
    expect(await screen.findAllByText("Therapy Studio Original")).toHaveLength(10);
    await user.click(screen.getByRole("button", { name: "New Worksheet" }));
    await user.type(screen.getByLabelText("Worksheet Title"), "My Feelings Worksheet");
    await user.click(screen.getByRole("button", { name: "Create Worksheet" }));

    expect(
      await screen.findByRole("heading", { name: "My Feelings Worksheet" })
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add Heading" }));
    const textEditor = screen.getByLabelText("Text");
    await user.clear(textEditor);
    await user.type(textEditor, "How I Feel Today");
    await user.selectOptions(screen.getByLabelText("Level"), "1");
    await user.selectOptions(screen.getByLabelText("Alignment"), "center");
    await user.click(screen.getByRole("button", { name: "Apply Block Changes" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(async () => {
      const document = await repository.getWorksheetDocument("route-id-1");
      expect(document.pages[0].blocks[0].text).toBe("How I Feel Today");
      expect(document.pages[0].blocks[0]).toEqual(
        expect.objectContaining({ level: 1, alignment: "center" })
      );
    });

    await user.click(screen.getByRole("link", { name: "Leave Builder" }));
    expect(
      await screen.findByRole("heading", { name: "Worksheets" })
    ).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Build/Edit" }));
    expect(await screen.findByText("How I Feel Today")).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Preview" }));
    expect(
      await screen.findByRole("heading", { name: "How I Feel Today", level: 1 })
    ).toHaveStyle("text-align: center");
    expect(
      screen.getByRole("button", { name: "Print / Save as PDF" })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Private Notes")).toBeNull();
    expect(screen.queryByText(/private resource notes/i)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Print / Save as PDF" }));
    expect(print).toHaveBeenCalledOnce();
    expect(router.state.location.pathname).toBe("/worksheets/route-id-1/preview");

    await user.click(screen.getByRole("link", { name: "Open for Session" }));
    expect(
      await screen.findByRole("heading", { name: "My Feelings Worksheet" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How I Feel Today" })).toBeVisible();
    expect(screen.queryByLabelText("Private Notes")).toBeNull();
    expect(screen.queryByText(/private resource notes/i)).toBeNull();
  });

  it("retains the local draft when saving fails", async () => {
    const resource = createWorksheetResource(
      { title: "Draft Worksheet" },
      { id: "worksheet", now: "2026-08-04T12:00:00.000Z" }
    );
    const document = createBlankWorksheetDocument("worksheet", {
      createId: () => "page",
      now: "2026-08-04T12:00:00.000Z",
    });
    const repository = {
      getWorksheetById: vi.fn().mockResolvedValue({ ...resource, archived: false }),
      getWorksheetDocument: vi.fn().mockResolvedValue(document),
      saveWorksheetDocument: vi.fn().mockRejectedValue(new Error("Storage failed")),
    };
    const user = userEvent.setup();
    renderRoutes(repository, "/worksheets/worksheet/build");

    await screen.findByRole("heading", { name: "Draft Worksheet" });
    await user.click(screen.getByRole("button", { name: "Add Paragraph" }));
    const editor = screen.getByLabelText("Text");
    await user.clear(editor);
    await user.type(editor, "Keep this draft");
    await user.click(screen.getByRole("button", { name: "Apply Block Changes" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Save Failed")).toBeInTheDocument();
    expect(screen.getByLabelText("Text")).toHaveValue("Keep this draft");
    expect(screen.getByRole("button", { name: "Retry Save" })).toBeInTheDocument();
  });

  it("shows starters, searches them, and duplicates one into the Builder", async () => {
    const repository = realRepository();
    const user = userEvent.setup();
    renderRoutes(repository);

    await screen.findByRole("heading", { name: "Worksheets" });
    await user.type(
      screen.getByRole("searchbox", { name: "Search Worksheets" }),
      "Thought Detective"
    );
    expect(screen.getByRole("heading", { name: "Thought Detective" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "My Worry Thermometer" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Duplicate to Edit" }));
    expect(
      await screen.findByRole("heading", { name: "Thought Detective Copy" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(
      (await repository.getWorksheetDocument("route-id-1")).pages[0].blocks
    ).not.toHaveLength(0);
    expect(
      (await repository.getWorksheetById("worksheet-starter-thought-detective"))
        .provenance
    ).toBe("therapy-studio-starter");
  });

  it("confirms permanent deletion and removes a therapist-created Worksheet", async () => {
    const repository = realRepository();
    const created = await repository.createWorksheet({ title: "Delete Me" });
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderRoutes(repository);

    expect(await screen.findByRole("heading", { name: "Delete Me" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Delete Permanently" }));

    expect(confirm).toHaveBeenCalledWith("Delete “Delete Me”? This cannot be undone.");
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Delete Me" })).toBeNull();
    });
    await expect(repository.getWorksheetById(created.resource.id)).rejects.toMatchObject({
      code: "worksheet-not-found",
    });
  });

  it("cancels permanent deletion and does not offer it for starter Worksheets", async () => {
    const repository = realRepository();
    await repository.createWorksheet({ title: "Keep Me" });
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderRoutes(repository);

    expect(await screen.findByRole("heading", { name: "Keep Me" })).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Delete Permanently" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Delete Permanently" }));
    expect(screen.getByRole("heading", { name: "Keep Me" })).toBeVisible();
    expect(await repository.getAllWorksheets()).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: "Keep Me" })])
    );
  });

  it("imports a structured Worksheet into the Library and opens it for editing", async () => {
    const repository = realRepository();
    const user = userEvent.setup();
    renderRoutes(repository);
    const now = "2026-08-04T12:00:00.000Z";
    const resource = createWorksheetResource(
      { title: "Imported Reflection Map", description: "Imported for editing" },
      { id: "imported-reflection-map", now }
    );
    const document = createBlankWorksheetDocument(resource.id, {
      createId: () => "imported-page",
      now,
    });

    await user.click(await screen.findByRole("button", { name: "Import Worksheets" }));
    fireEvent.change(screen.getByLabelText("Worksheet JSON"), {
      target: {
        files: [
          {
            name: "reflection-map.json",
            text: vi.fn().mockResolvedValue(
              JSON.stringify({
                format: "therapy-studio-worksheets",
                version: 1,
                worksheets: [{ resource, document }],
              })
            ),
          },
        ],
      },
    });
    expect(await screen.findByText("Imported Reflection Map")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Confirm Import" }));
    expect(
      await screen.findByText("1 Worksheet was imported successfully.")
    ).toBeVisible();

    await user.type(
      screen.getByRole("searchbox", { name: "Search Worksheets" }),
      "Imported Reflection"
    );
    expect(
      screen.getByRole("heading", { name: "Imported Reflection Map" })
    ).toBeVisible();
    await user.click(screen.getByRole("link", { name: "Build/Edit" }));
    expect(
      await screen.findByRole("heading", { name: "Imported Reflection Map" })
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Add Heading" })).toBeVisible();
  });

  it("persists one curated visual through Builder, Preview, Session, and print", async () => {
    const repository = realRepository();
    const created = await repository.createWorksheet({ title: "Visual Worksheet" });
    const document = await repository.getWorksheetDocument(created.resource.id);
    await repository.saveWorksheetDocument(created.resource.id, {
      ...document,
      pages: [
        {
          ...document.pages[0],
          blocks: [
            {
              id: "visual-block",
              sortOrder: 0,
              type: "visual",
              iconId: "curated-culture-holidays-watarun01",
              label: "Temple visual",
              decorative: false,
              size: "medium",
              alignment: "center",
            },
          ],
        },
      ],
    });
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const user = userEvent.setup();
    renderRoutes(repository, `/worksheets/${created.resource.id}/build`);

    expect(await screen.findByRole("img", { name: "Temple visual" })).toBeVisible();
    await user.click(screen.getByRole("link", { name: "Preview" }));
    expect(await screen.findByRole("img", { name: "Temple visual" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Print / Save as PDF" }));
    expect(print).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("link", { name: "Open for Session" }));
    expect(await screen.findByRole("img", { name: "Temple visual" })).toBeVisible();
  });

  it("persists structured blocks through Preview, Session, and print", async () => {
    const repository = realRepository();
    const created = await repository.createWorksheet({ title: "Structured Worksheet" });
    const document = await repository.getWorksheetDocument(created.resource.id);
    await repository.saveWorksheetDocument(created.resource.id, {
      ...document,
      pages: [
        {
          ...document.pages[0],
          blocks: [
            {
              id: "reflection-block",
              sortOrder: 0,
              type: "reflection",
              title: "What happened?",
              instruction: "Write what you remember.",
              lineCount: 4,
            },
            {
              id: "table-block",
              sortOrder: 1,
              type: "basic-table",
              headers: ["Before", "After"],
              rows: [["", ""]],
            },
          ],
        },
      ],
    });
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const user = userEvent.setup();
    renderRoutes(repository, `/worksheets/${created.resource.id}/build`);

    expect(await screen.findByRole("heading", { name: "What happened?" })).toBeVisible();
    expect(screen.getByRole("table")).toBeVisible();
    [
      "Add Reflection",
      "Add Basic Table",
      "Add Sentence Completion",
      "Add CBT Thought Check",
      "Add Coping Plan",
    ].forEach((name) => {
      expect(screen.getByRole("button", { name })).toBeVisible();
    });
    await user.click(screen.getByRole("link", { name: "Preview" }));
    expect(await screen.findByRole("heading", { name: "What happened?" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Print / Save as PDF" }));
    expect(print).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("link", { name: "Open for Session" }));
    expect(await screen.findByRole("heading", { name: "What happened?" })).toBeVisible();
    expect(screen.getByRole("table")).toBeVisible();

    const reopened = await repository.getWorksheetDocument(created.resource.id);
    expect(reopened.pages[0].blocks.map(({ type }) => type)).toEqual([
      "reflection",
      "basic-table",
    ]);
  });

  it("keeps live responses temporary, resets them, and saves an independent completed copy", async () => {
    const repository = realRepository();
    const created = await repository.createWorksheet({ title: "Live Check In" });
    const source = await repository.getWorksheetDocument(created.resource.id);
    await repository.saveWorksheetDocument(created.resource.id, {
      ...source,
      pages: [
        {
          ...source.pages[0],
          blocks: [
            {
              id: "short",
              sortOrder: 0,
              type: "short-response",
              prompt: "How are you feeling?",
              placeholder: "",
              lineCount: 1,
            },
            {
              id: "checklist",
              sortOrder: 1,
              type: "checklist",
              prompt: "What helped?",
              items: ["Breathing", "Movement"],
              allowOther: false,
            },
          ],
        },
      ],
    });
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm");
    renderRoutes(repository, `/worksheets/${created.resource.id}/session`);

    await user.type(
      await screen.findByLabelText("Response for How are you feeling?"),
      "Calmer"
    );
    await user.click(screen.getByRole("checkbox", { name: "Breathing" }));
    expect(
      (await repository.getWorksheetDocument(created.resource.id)).sessionResponses
    ).toBeUndefined();
    expect(screen.queryByText(/private resource notes/i)).toBeNull();
    expect(
      screen.queryByRole("button", { name: /delete|archive|edit metadata/i })
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: "Save Completed Copy" }));
    expect(await screen.findByText("Completed copy saved.")).toBeVisible();
    const completed = (await repository.getAllWorksheets()).find(({ title }) =>
      title.endsWith("— Completed Copy")
    );
    expect(completed).toBeTruthy();
    expect(
      (await repository.getWorksheetDocument(completed.id)).sessionResponses
    ).toMatchObject({
      short: { text: "Calmer" },
      checklist: { selected: [0] },
    });

    confirm.mockReturnValueOnce(true);
    await user.click(screen.getByRole("button", { name: "Reset Responses" }));
    expect(screen.getByLabelText("Response for How are you feeling?")).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: "Breathing" })).not.toBeChecked();

    await user.type(screen.getByLabelText("Response for How are you feeling?"), "Keep");
    confirm.mockReturnValueOnce(false);
    await user.click(screen.getByRole("button", { name: "Exit Session" }));
    expect(screen.getByRole("heading", { name: "Live Check In" })).toBeVisible();
    confirm.mockReturnValueOnce(true);
    await user.click(screen.getByRole("button", { name: "Exit Session" }));
    expect(await screen.findByRole("link", { name: "Build/Edit" })).toBeVisible();
  });

  it("reopens and prints a completed copy with responses rendered", async () => {
    const repository = realRepository();
    const created = await repository.createWorksheet({ title: "Completed View" });
    const source = await repository.getWorksheetDocument(created.resource.id);
    await repository.saveWorksheetDocument(created.resource.id, {
      ...source,
      pages: [
        {
          ...source.pages[0],
          blocks: [
            {
              id: "reflection",
              sortOrder: 0,
              type: "reflection",
              title: "What did you notice?",
              instruction: "",
              lineCount: 3,
            },
          ],
        },
      ],
    });
    const completed = await repository.saveCompletedWorksheetCopy(created.resource.id, {
      reflection: { text: "My breathing slowed down." },
    });
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const user = userEvent.setup();
    renderRoutes(repository, `/worksheets/${completed.resource.id}/session`);

    expect(await screen.findByLabelText("Response for What did you notice?")).toHaveValue(
      "My breathing slowed down."
    );
    await user.click(screen.getByRole("button", { name: "Print / Save as PDF" }));
    expect(print).toHaveBeenCalledOnce();
  });

  it("shows an in-shell-safe unknown Worksheet state", async () => {
    const repository = {
      getWorksheetById: vi.fn().mockRejectedValue(new Error("missing")),
      getWorksheetDocument: vi.fn().mockRejectedValue(new Error("missing")),
    };
    renderRoutes(repository, "/worksheets/missing/build");

    expect(
      await screen.findByRole("heading", { name: "Worksheet Not Found" })
    ).toBeInTheDocument();
  });
});
