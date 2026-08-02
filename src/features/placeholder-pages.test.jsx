import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { renderWithRouter } from "../test/test-utils";
import ClientsPage from "./clients/ClientsPage";
import GamesPage from "./games/GamesPage";
import SavedPage from "./saved/SavedPage";
import SceneBuilderPage from "./scene-builder/SceneBuilderPage";
import SettingsPage from "./settings/SettingsPage";
import WhiteboardPage from "./whiteboard/WhiteboardPage";
import WorkbooksPage from "./workbooks/WorkbooksPage";
import WorksheetsPage from "./worksheets/WorksheetsPage";

const pages = [
  ["Clients", ClientsPage],
  ["Games", GamesPage],
  ["Saved", SavedPage],
  ["Scene Builder", SceneBuilderPage],
  ["Settings", SettingsPage],
  ["Whiteboard", WhiteboardPage],
  ["Workbooks", WorkbooksPage],
  ["Worksheets", WorksheetsPage],
];

describe("placeholder pages", () => {
  it.each(pages)("renders the %s page", (heading, Page) => {
    renderWithRouter(<Page />);

    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
  });
});
