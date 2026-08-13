import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { render } from "@testing-library/react";
import InterventionEditorPage from "./InterventionEditorPage";

function renderEditor(repository, entry = "/interventions/new/edit") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route
          element={<InterventionEditorPage repository={repository} />}
          path="/interventions/:interventionId/edit"
        />
        <Route element={<p>Saved</p>} path="/interventions/:interventionId" />
      </Routes>
    </MemoryRouter>
  );
}

describe("InterventionEditorPage", () => {
  it("creates a validated Resource and guidance pair without losing the editor pathway", async () => {
    const user = userEvent.setup();
    const createIntervention = vi.fn(async (pair) => pair);
    renderEditor({ createIntervention });

    await user.type(screen.getByRole("textbox", { name: "Title" }), "Shared Worry Map");
    await user.type(
      screen.getByRole("textbox", { name: "Overview" }),
      "Map a worry together."
    );
    await user.type(
      screen.getByRole("textbox", { name: "Introduction or Setup" }),
      "We can work on this together."
    );
    await user.type(
      screen.getByRole("textbox", { name: "Steps 1" }),
      "Open a shared whiteboard."
    );
    await user.click(screen.getByRole("button", { name: "Create Intervention" }));

    expect(createIntervention).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: expect.objectContaining({
          title: "Shared Worry Map",
          telehealthFriendly: true,
          type: "intervention",
        }),
        guidance: expect.objectContaining({
          overview: "Map a worry together.",
          steps: ["Open a shared whiteboard."],
        }),
      })
    );
    expect(await screen.findByText("Saved")).toBeVisible();
  });
});
