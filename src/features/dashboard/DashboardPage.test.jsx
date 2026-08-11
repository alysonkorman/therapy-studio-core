import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import DashboardPage from "./DashboardPage";

const destinations = [
  ["Prompts", "/prompts"],
  ["Interventions", "/interventions"],
  ["Games", "/games"],
  ["Worksheets", "/worksheets"],
  ["Session Profiles", "/clients"],
  ["Saved", "/saved"],
];

function renderDashboard({ recentResources = [] } = {}) {
  const memoryRepository = {
    getRecentlyUsedResources: vi.fn().mockResolvedValue(recentResources),
  };

  return render(
    <MemoryRouter>
      <DashboardPage memoryRepository={memoryRepository} />
    </MemoryRouter>
  );
}

describe("Dashboard tool navigation", () => {
  it.each(destinations)("links %s to %s", (label, destination) => {
    renderDashboard();

    expect(screen.getByRole("link", { name: `Open ${label}` })).toHaveAttribute(
      "href",
      destination
    );
  });

  it("uses keyboard-accessible links without nested interactive controls", () => {
    const { container } = renderDashboard();
    const promptLink = screen.getByRole("link", { name: "Open Prompts" });

    promptLink.focus();
    expect(promptLink).toHaveFocus();
    expect(container.querySelector("a button, button a")).toBeNull();
  });

  it("keeps the existing Universal Resource Search as the primary action", () => {
    renderDashboard();

    expect(screen.getByRole("form", { name: "Search all resources" })).toBeVisible();
    expect(document.querySelector("#universal-search")).toBeInTheDocument();
  });

  it("presents Games as an available Trivia destination", () => {
    renderDashboard();

    expect(screen.getByRole("link", { name: "Open Games" })).toHaveTextContent(
      "Play a calm, screen-share-friendly Trivia game."
    );
    expect(screen.getByRole("link", { name: "Open Games" })).not.toHaveTextContent(
      "Coming Later"
    );
    expect(screen.queryByRole("button", { name: /session|randomize/i })).toBeNull();
  });

  it("shows a quiet empty state when no Resources have been used", async () => {
    renderDashboard();

    expect(await screen.findByText("No recently used Resources yet.")).toBeVisible();
    expect(screen.getByRole("link", { name: "View Saved" })).toHaveAttribute(
      "href",
      "/saved"
    );
  });

  it("renders recently used Resources from Resource Memory", async () => {
    renderDashboard({
      recentResources: [
        {
          memory: { resourceId: "deck-1", useCount: 2 },
          resource: {
            id: "deck-1",
            type: "prompt-deck",
            title: "Feelings Check-In",
          },
        },
      ],
    });

    expect(
      await screen.findByRole("link", { name: "Continue Feelings Check-In" })
    ).toHaveAttribute("href", "/prompts/deck-1");
    expect(screen.getByText("Prompt Deck · Used 2 times")).toBeVisible();
  });

  it("returns a recently used Intervention to its detail route", async () => {
    renderDashboard({
      recentResources: [
        {
          memory: { resourceId: "intervention-1", useCount: 1 },
          resource: { id: "intervention-1", type: "intervention", title: "Calm Plan" },
        },
      ],
    });

    expect(
      await screen.findByRole("link", { name: "Continue Calm Plan" })
    ).toHaveAttribute("href", "/interventions/intervention-1");
  });

  it("returns a recently used Trivia Set to its playable route", async () => {
    renderDashboard({
      recentResources: [
        {
          memory: { resourceId: "game-1", useCount: 1 },
          resource: { id: "game-1", type: "game", title: "Space Trivia" },
        },
      ],
    });

    expect(
      await screen.findByRole("link", { name: "Continue Space Trivia" })
    ).toHaveAttribute("href", "/games/game-1");
  });
});

describe("Session Profiles documentation", () => {
  it.each(["project-checklist.md", "master-plan.md"])(
    "records commit 4ecff03 in %s",
    (filename) => {
      const documentText = readFileSync(resolve("docs", filename), "utf8");

      expect(documentText).toContain("4ecff03");
    }
  );
});
