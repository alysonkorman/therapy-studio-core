import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Link, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { useCurrentSessionStore } from "../../stores/currentSessionStore";
import CurrentSessionCard from "./CurrentSessionCard";

describe("CurrentSessionCard", () => {
  beforeEach(() => useCurrentSessionStore.getState().clearContext());

  it("renders basic optional fields and the temporary privacy notice", () => {
    render(<CurrentSessionCard />);

    expect(screen.getByLabelText(/generic client identifier/i)).toBeVisible();
    expect(screen.getByLabelText(/age or age range/i)).toBeVisible();
    expect(screen.getByLabelText(/^diagnoses$/i)).toBeVisible();
    expect(screen.getByLabelText(/^goals$/i)).toBeVisible();
    expect(screen.getByLabelText(/^interests$/i)).toBeVisible();
    expect(screen.getByLabelText(/^current state$/i)).toBeVisible();
    expect(screen.getByLabelText(/^session length$/i)).toBeVisible();
    expect(screen.getByLabelText(/^telehealth setting$/i)).toBeVisible();
    expect(screen.getByLabelText(/^materials available$/i)).toBeVisible();
    expect(screen.getByText(/temporary context is not an EHR record/i)).toBeVisible();
  });

  it("reveals and hides advanced fields without losing values", async () => {
    const user = userEvent.setup();
    render(<CurrentSessionCard />);

    expect(screen.queryByLabelText(/sensory preferences/i)).toBeNull();
    await user.click(screen.getByRole("button", { name: /show advanced/i }));
    const sensoryPreferences = screen.getByLabelText(/sensory preferences/i);
    await user.type(sensoryPreferences, "quiet room");
    await user.click(screen.getByRole("button", { name: /hide advanced/i }));
    expect(screen.queryByLabelText(/sensory preferences/i)).toBeNull();

    await user.click(screen.getByRole("button", { name: /show advanced/i }));
    expect(screen.getByLabelText(/sensory preferences/i)).toHaveValue("quiet room");
  });

  it("updates shared state and preserves it across route navigation", async () => {
    const user = userEvent.setup();

    function NavigationHarness() {
      return (
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route
              element={
                <>
                  <CurrentSessionCard />
                  <Link to="/away">Leave dashboard</Link>
                </>
              }
              path="/"
            />
            <Route element={<Link to="/">Return to dashboard</Link>} path="/away" />
          </Routes>
        </MemoryRouter>
      );
    }

    render(<NavigationHarness />);
    await user.type(screen.getByLabelText(/^goals$/i), "rapport");
    expect(useCurrentSessionStore.getState().context.goals).toBe("rapport");
    await user.click(screen.getByRole("link", { name: /leave dashboard/i }));
    await user.click(screen.getByRole("link", { name: /return to dashboard/i }));
    expect(screen.getByLabelText(/^goals$/i)).toHaveValue("rapport");
  });

  it("shows active context and requires confirmation before clearing", async () => {
    const user = userEvent.setup();
    render(<CurrentSessionCard />);

    await user.type(screen.getByLabelText(/^interests$/i), "Pokémon");
    expect(screen.getByText(/context active/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: /^clear session$/i }));
    expect(screen.getByLabelText(/^interests$/i)).toHaveValue("Pokémon");
    expect(screen.getByRole("alert")).toHaveTextContent(
      /clear all temporary session context/i
    );

    await user.click(screen.getByRole("button", { name: /yes, clear session/i }));
    expect(screen.getByLabelText(/^interests$/i)).toHaveValue("");
    expect(screen.queryByText(/context active/i)).toBeNull();
  });
});
