import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { renderWithRouter } from "../test/test-utils";
import GamesPage from "./games/GamesPage";
import SceneBuilderPage from "./scene-builder/SceneBuilderPage";
import WhiteboardPage from "./whiteboard/WhiteboardPage";
import WorkbooksPage from "./workbooks/WorkbooksPage";

const pages = [
  ["Games", GamesPage],
  ["Scene Builder", SceneBuilderPage],
  ["Whiteboard", WhiteboardPage],
  ["Workbooks", WorkbooksPage],
];

describe("placeholder pages", () => {
  it.each(pages)("renders the %s page", (heading, Page) => {
    renderWithRouter(<Page />);

    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByText("Coming soon.")).toBeInTheDocument();
  });
});
