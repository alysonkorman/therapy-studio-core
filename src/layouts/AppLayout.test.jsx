import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { navigationItems } from "../app/navigation";
import AppLayout from "./AppLayout";

function renderLayout(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppLayout />} path="/">
          <Route index element={<h1>Dashboard Content</h1>} />
          <Route element={<h1>Prompt Library</h1>} path="prompts" />
          <Route element={<h1>Prompt Deck</h1>} path="prompts/:deckId" />
          <Route element={<h1>Worksheet Library</h1>} path="worksheets" />
          <Route element={<h1>Worksheet Detail</h1>} path="worksheets/:worksheetId" />
          <Route
            element={<h1>Worksheet Builder</h1>}
            path="worksheets/:worksheetId/build"
          />
          <Route element={<h1>Feature Page</h1>} path="*" />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

function mainNavigation() {
  return screen.getByRole("navigation", { name: "Main navigation" });
}

function expectCurrentPage(label) {
  const currentPage = screen.getByText("Current Page").parentElement;
  expect(within(currentPage).getByText(label)).toBeInTheDocument();
}

describe("AppLayout", () => {
  it("renders every configured navigation destination exactly once in primary navigation", () => {
    renderLayout();
    const navigation = mainNavigation();

    navigationItems.forEach(({ label, path }) => {
      const links = within(navigation).getAllByRole("link", { name: label });
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute("href", path);
    });
  });

  it("marks Home active only on the root route", () => {
    const { unmount } = renderLayout();
    expect(within(mainNavigation()).getByRole("link", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expectCurrentPage("Home");
    unmount();

    renderLayout("/prompts/deck-1");
    expect(
      within(mainNavigation()).getByRole("link", { name: "Home" })
    ).not.toHaveAttribute("aria-current");
  });

  it("keeps the parent navigation active on nested Prompt and Worksheet routes", () => {
    const { unmount } = renderLayout("/prompts/deck-1");
    expect(
      within(mainNavigation()).getByRole("link", { name: "Prompts" })
    ).toHaveAttribute("aria-current", "page");
    expectCurrentPage("Prompts");
    unmount();

    renderLayout("/worksheets/worksheet-1/build");
    expect(
      within(mainNavigation()).getByRole("link", { name: "Worksheets" })
    ).toHaveAttribute("aria-current", "page");
    expectCurrentPage("Worksheets");
  });

  it("opens and closes the shared navigation with keyboard-operable controls", async () => {
    const user = userEvent.setup();
    renderLayout("/prompts");
    const toggle = screen.getByRole("button", { name: "Open Navigation" });

    toggle.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Close Navigation" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(document.getElementById("app-navigation")).toHaveClass("sidebar--open");
    await waitFor(() =>
      expect(within(mainNavigation()).getByRole("link", { name: "Home" })).toHaveFocus()
    );

    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Open Navigation" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(screen.getByRole("button", { name: "Open Navigation" })).toHaveFocus();
  });

  it("closes the mobile navigation after selecting a destination", async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole("button", { name: "Open Navigation" }));
    await user.click(within(mainNavigation()).getByRole("link", { name: "Prompts" }));

    expect(screen.getByRole("button", { name: "Open Navigation" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(document.getElementById("app-navigation")).not.toHaveClass("sidebar--open");
    expectCurrentPage("Prompts");
  });

  it("keeps Settings reachable through the same responsive navigation", async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole("button", { name: "Open Navigation" }));
    const settings = within(mainNavigation()).getByRole("link", { name: "Settings" });
    expect(settings).toHaveAttribute("href", "/settings");
    expect(settings).toBeVisible();
  });

  it("points global search to the existing Dashboard search section", () => {
    renderLayout("/worksheets");
    expect(screen.getByRole("link", { name: "Search Resources" })).toHaveAttribute(
      "href",
      "/#universal-search"
    );
  });

  it("moves focus to the main content through the skip link", async () => {
    const user = userEvent.setup();
    renderLayout();

    const skipLink = screen.getByRole("link", { name: "Skip to Content" });
    expect(skipLink).toHaveAttribute("href", "#main-content");
    await user.click(skipLink);
    expect(screen.getByRole("main")).toHaveFocus();
  });
});
