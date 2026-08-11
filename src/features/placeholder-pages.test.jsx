import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { renderWithRouter } from "../test/test-utils";
import SceneBuilderPage from "./scene-builder/SceneBuilderPage";
import WorkbooksPage from "./workbooks/WorkbooksPage";

const pages = [
  ["Scene Builder", SceneBuilderPage],
  ["Workbooks", WorkbooksPage],
];

describe("placeholder pages", () => {
  it.each(pages)("renders the %s page", (heading, Page) => {
    renderWithRouter(<Page />);

    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByText("Coming soon.")).toBeInTheDocument();
  });
});
