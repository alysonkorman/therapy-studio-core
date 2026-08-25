import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { renderWithRouter } from "../../test/test-utils";
import LiveSessionParticipantPage from "./LiveSessionParticipantPage";

describe("Live Session participant route", () => {
  it("mounts a participant-safe Whiteboard surface without the therapist app shell", () => {
    renderWithRouter(
      <Routes>
        <Route element={<LiveSessionParticipantPage />} path="/join/:sessionId" />
      </Routes>,
      { initialEntries: ["/join/local-test"] }
    );

    expect(screen.queryByText("Live Activity")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Whiteboard Session" })).toBeNull();
    expect(screen.getByRole("button", { name: "Draw" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Draw" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Colors" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.queryByLabelText("Main navigation")).toBeNull();
    expect(screen.queryByText("Therapist Resource Memory")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Save$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Open$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^New$/ })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Whiteboard title" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Activity" })).toBeNull();
    expect(screen.queryByText("Session Profiles")).toBeNull();
    expect(screen.queryByText("Settings")).toBeNull();
  });

  it("handles an absent session identifier safely", () => {
    render(
      <MemoryRouter>
        <LiveSessionParticipantPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/link is invalid/i)).toBeVisible();
  });
});
