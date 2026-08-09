import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createDefaultResourceMemory } from "../../models";
import { renderWithRouter } from "../../test/test-utils";
import InterventionDetailPage from "./InterventionDetailPage";

const NOW = "2026-08-09T12:00:00.000Z";

function memoryRepository() {
  return {
    getResourceMemory: vi.fn(async (id) => createDefaultResourceMemory(id, NOW)),
    markResourceUsed: vi.fn(async (id) => ({
      ...createDefaultResourceMemory(id, NOW),
      lastUsedAt: NOW,
      useCount: 1,
    })),
    toggleFavorite: vi.fn(),
    setRating: vi.fn(),
    clearRating: vi.fn(),
    updateTherapistNotes: vi.fn(),
    updateWorksWellWhen: vi.fn(),
    updateKidsWhoUsuallyLikeThis: vi.fn(),
    updateAdaptations: vi.fn(),
  };
}

function privateMemoryRepository() {
  const repository = memoryRepository();
  repository.getResourceMemory.mockImplementation(async (id) => ({
    ...createDefaultResourceMemory(id, NOW),
    favorite: true,
    rating: 5,
    therapistNotes: "Private intervention note",
    worksWellWhen: ["Low verbal"],
  }));
  return repository;
}

describe("InterventionDetailPage", () => {
  it("shows session-ready guidance and back navigation", async () => {
    const repository = memoryRepository();
    renderWithRouter(
      <InterventionDetailPage
        interventionId="intervention-worry-thermometer"
        memoryRepository={repository}
      />,
      {
        initialEntries: ["/interventions/intervention-worry-thermometer"],
      }
    );

    expect(
      screen.getByRole("heading", { name: "Worry Thermometer", level: 1 })
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "How to Introduce It" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "What to Do" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Questions for Afterward" })
    ).toBeVisible();
    expect(screen.getByText("Therapy Studio original")).toBeVisible();
    expect(screen.getByRole("link", { name: /back to interventions/i })).toHaveAttribute(
      "href",
      "/interventions"
    );
    expect(repository.markResourceUsed).not.toHaveBeenCalled();
  });

  it("records use only after the explicit Mark Used action", async () => {
    const user = userEvent.setup();
    const repository = memoryRepository();
    renderWithRouter(
      <InterventionDetailPage
        interventionId="intervention-worry-thermometer"
        memoryRepository={repository}
      />,
      {
        initialEntries: ["/interventions/intervention-worry-thermometer"],
      }
    );

    await user.click(screen.getByRole("button", { name: "Therapist Resource Memory" }));
    await user.click(await screen.findByRole("button", { name: "Mark Used" }));
    expect(repository.markResourceUsed).toHaveBeenCalledWith(
      "intervention-worry-thermometer"
    );
  });

  it("keeps guidance visible while therapist Resource Memory stays closed", async () => {
    const user = userEvent.setup();
    const repository = privateMemoryRepository();
    renderWithRouter(
      <InterventionDetailPage
        interventionId="intervention-worry-thermometer"
        memoryRepository={repository}
      />,
      {
        initialEntries: ["/interventions/intervention-worry-thermometer"],
      }
    );

    expect(screen.getByRole("heading", { name: "What to Do" })).toBeVisible();
    expect(screen.getByText(/draw a simple scale from 0 to 5/i)).toBeVisible();
    expect(screen.queryByText("Private intervention note")).toBeNull();
    expect(screen.queryByRole("button", { name: "Favorite" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Mark Used" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Therapist Resource Memory" }));
    expect(await screen.findByRole("button", { name: "Favorite" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Mark Used" })).toBeVisible();
    expect(screen.queryByText("Private intervention note")).toBeNull();

    await user.click(screen.getByRole("button", { name: /private resource memory/i }));
    expect(screen.getByLabelText("Private Notes")).toHaveValue(
      "Private intervention note"
    );
    await user.click(
      screen.getByRole("button", { name: "Hide Therapist Resource Memory" })
    );
    expect(screen.queryByText("Private intervention note")).toBeNull();
    expect(screen.getByRole("heading", { name: "What to Do" })).toBeVisible();
  });

  it("handles an unknown Intervention without crashing", () => {
    renderWithRouter(
      <InterventionDetailPage
        interventionId="missing"
        memoryRepository={memoryRepository()}
      />,
      {
        initialEntries: ["/interventions/missing"],
      }
    );

    expect(
      screen.getByRole("heading", { name: "Intervention Not Found", level: 1 })
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to Interventions" })).toHaveAttribute(
      "href",
      "/interventions"
    );
  });
});
