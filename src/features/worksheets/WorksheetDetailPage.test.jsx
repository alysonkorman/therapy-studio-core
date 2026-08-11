import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import WorksheetDetailPage from "./WorksheetDetailPage";

function worksheetDocument(blocks = [], pageCount = 1) {
  return {
    documentVersion: 1,
    worksheetId: "worksheet-1",
    pages: Array.from({ length: pageCount }, (_, pageIndex) => ({
      id: `page-${pageIndex + 1}`,
      title: `Page ${pageIndex + 1}`,
      sortOrder: pageIndex,
      settings: { paperSize: "letter", orientation: "portrait", margin: "normal" },
      blocks:
        pageIndex === 0
          ? blocks.map((block, sortOrder) => ({ ...block, sortOrder }))
          : [
              {
                id: `page-${pageIndex + 1}-heading`,
                sortOrder: 0,
                type: "heading",
                text: `Page ${pageIndex + 1} Content`,
                level: 2,
                alignment: "left",
              },
            ],
    })),
    createdAt: "2026-08-11T12:00:00.000Z",
    updatedAt: "2026-08-11T12:00:00.000Z",
  };
}

function renderDetail({
  document = worksheetDocument(),
  resource = {},
  repository,
} = {}) {
  const worksheet = {
    id: "worksheet-1",
    title: "My Worry Thermometer Copy",
    description: "Notice how big a worry feels and choose support that fits.",
    provenance: "original",
    ...resource,
  };
  const resolvedRepository = repository ?? {
    getWorksheetById: vi.fn().mockResolvedValue(worksheet),
    getWorksheetDocument: vi.fn().mockResolvedValue(document),
    duplicateWorksheet: vi.fn(),
  };
  const router = createMemoryRouter(
    [
      {
        path: "/worksheets/:worksheetId",
        element: <WorksheetDetailPage repository={resolvedRepository} />,
      },
      { path: "*", element: <p>Destination</p> },
    ],
    { initialEntries: ["/worksheets/worksheet-1"] }
  );
  render(<RouterProvider router={router} />);
  return { repository: resolvedRepository, router };
}

describe("WorksheetDetailPage", () => {
  it("groups actions and renders a therapist-owned Worksheet read-only", async () => {
    renderDetail({
      document: worksheetDocument([
        {
          id: "heading",
          type: "heading",
          text: "Worry Thermometer",
          level: 2,
          alignment: "center",
        },
        {
          id: "response",
          type: "short-response",
          prompt: "My worry feels like",
          placeholder: "",
          lineCount: 1,
        },
      ]),
    });

    expect(await screen.findByText("Editable Worksheet")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "My Worry Thermometer Copy" })
    ).toBeVisible();
    expect(screen.getByRole("region", { name: "Worksheet preview" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Worry Thermometer" })).toBeVisible();
    expect(screen.getByText("My worry feels like")).toBeVisible();
    expect(screen.queryByRole("textbox")).toBeNull();

    const session = screen.getByRole("link", { name: "Open for Session" });
    expect(session).toHaveAttribute("href", "/worksheets/worksheet-1/session");
    expect(session).toHaveClass("worksheet-detail-primary-action");
    expect(screen.getByRole("link", { name: "Build/Edit" })).toHaveAttribute(
      "href",
      "/worksheets/worksheet-1/build"
    );
    expect(screen.getByRole("link", { name: "Preview" })).toHaveAttribute(
      "href",
      "/worksheets/worksheet-1/preview"
    );
    expect(screen.getByRole("link", { name: "Back to Library" })).toHaveAttribute(
      "href",
      "/worksheets"
    );
  });

  it("renders every page of a multi-page imported Worksheet", async () => {
    renderDetail({
      document: worksheetDocument([], 3),
      resource: { provenance: "imported", title: "Imported Worksheet" },
    });

    expect(await screen.findByLabelText("Page 1")).toBeVisible();
    expect(screen.getByLabelText("Page 2")).toBeVisible();
    expect(screen.getByLabelText("Page 3")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Page 3 Content" })).toBeVisible();
  });

  it("renders a protected starter and preserves Duplicate to Edit", async () => {
    const user = userEvent.setup();
    const repository = {
      getWorksheetById: vi.fn().mockResolvedValue({
        id: "worksheet-1",
        title: "Starter Worksheet",
        description: "A protected starter.",
        provenance: "therapy-studio-starter",
      }),
      getWorksheetDocument: vi.fn().mockResolvedValue(
        worksheetDocument([
          {
            id: "heading",
            type: "heading",
            text: "Starter Content",
            level: 2,
            alignment: "left",
          },
        ])
      ),
      duplicateWorksheet: vi.fn().mockResolvedValue({
        resource: { id: "starter-copy" },
      }),
    };
    const { router } = renderDetail({ repository });

    expect(await screen.findByText("Therapy Studio Original")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Starter Content" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Build/Edit" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Duplicate to Edit" }));
    expect(repository.duplicateWorksheet).toHaveBeenCalledWith("worksheet-1");
    expect(router.state.location.pathname).toBe("/worksheets/starter-copy/build");
  });

  it("renders a minimal Worksheet as an empty white page without failing", async () => {
    renderDetail();
    expect(
      await screen.findByRole("region", { name: "Worksheet preview" })
    ).toBeVisible();
    expect(screen.getByText("Add a block to begin this page.")).toBeVisible();
    expect(document.querySelector(".worksheet-paper")).toBeTruthy();
  });
});
