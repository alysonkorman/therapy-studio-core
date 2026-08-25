import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTherapyStudioDatabase, createWorksheetRepository } from "../../lib/data";
import { createWorksheetResource } from "../../models";
import { generalKnowledgeTrivia, pictureWordBingo } from "../../data/resources";
import { useCurrentSessionStore } from "../../stores/currentSessionStore";
import { IDBKeyRange, indexedDB } from "../../test/indexedDb";
import { renderWithRouter } from "../../test/test-utils";
import ResourceSearch from "./ResourceSearch";

const intervention = {
  id: "intervention-1",
  type: "intervention",
  title: "Feelings Jenga",
  description: "Identify and discuss emotions through play.",
  worksWellWhen: ["They're shutting down"],
  useWith: [],
  kidsWhoLike: ["Pokémon"],
  goals: ["Rapport"],
  diagnoses: [],
  ageRanges: [],
  settings: [],
  materials: ["Jenga blocks"],
  durationMinutes: 10,
  telehealthFriendly: true,
  source: "",
  research: [],
  myNotes: "",
  rating: null,
  favorite: false,
  usageCount: 0,
};

const promptDeck = {
  ...intervention,
  id: "deck-1",
  type: "prompt-deck",
  title: "Brave Questions",
  description: "Conversation starters.",
  category: "Strengths",
  tags: ["rapport"],
  prompts: [{ id: "prompt-1", text: "What is one brave thing you tried?" }],
};

const resources = [intervention, promptDeck];
const databases = [];
const worksheet = createWorksheetResource(
  {
    title: "Calm Body Map",
    description: "Notice grounding signals and plan a calming routine.",
    category: "Regulation",
    tags: ["rapport", "grounding"],
  },
  { id: "worksheet-1", now: "2026-08-09T12:00:00.000Z" }
);

function worksheetSource(records = [{ ...worksheet, archived: false }]) {
  return { getAllWorksheets: vi.fn().mockResolvedValue(records) };
}

function persistedWorksheetSource() {
  const database = createTherapyStudioDatabase({
    name: `resource-search-test-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  });
  databases.push(database);
  return createWorksheetRepository({
    database,
    createId: () => "worksheet-persisted",
    now: () => "2026-08-09T12:00:00.000Z",
  });
}

describe("ResourceSearch", () => {
  beforeEach(() => useCurrentSessionStore.getState().clearContext());
  afterEach(async () => {
    await Promise.all(
      databases.splice(0).map(async (database) => {
        database.close();
        await database.delete();
      })
    );
  });

  it("runs with Enter without reload and keeps the query visible", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ResourceSearch resources={resources} />);
    const input = screen.getByRole("searchbox", {
      name: /what do you need right now/i,
    });

    await user.type(input, "brave{Enter}");

    expect(input).toHaveValue("brave");
    expect(screen.getByText(/1 result for “brave”/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Brave Questions" })).toBeVisible();
  });

  it("prevents default form navigation", () => {
    renderWithRouter(<ResourceSearch resources={resources} />);
    expect(
      fireEvent.submit(screen.getByRole("form", { name: /search all resources/i }))
    ).toBe(false);
  });

  it("runs the same search from the Search button", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ResourceSearch resources={resources} />);
    const input = screen.getByRole("searchbox", {
      name: /what do you need right now/i,
    });

    await user.type(input, "Feelings Jenga");
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    expect(input).toHaveValue("Feelings Jenga");
    expect(screen.getByText(/2 results for “Feelings Jenga”/i)).toBeVisible();
    const resultRegions = screen.getAllByRole("region", { name: /search result:/i });
    expect(
      within(resultRegions[0]).getByRole("heading", { name: "Feelings Jenga" })
    ).toBeVisible();
  });

  it("keeps private Resource Memory narrative out of search results", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ResourceSearch resources={resources} />);

    await user.type(screen.getByRole("searchbox"), "Feelings Jenga{Enter}");

    expect(
      await screen.findAllByRole("region", { name: "Search result: Feelings Jenga" })
    ).toHaveLength(1);
    expect(screen.queryByLabelText("Private Notes")).toBeNull();
    expect(screen.queryByText(/private resource notes/i)).toBeNull();
  });

  it("runs suggested searches and renders interventions appropriately", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ResourceSearch resources={resources} />);

    await user.click(screen.getByRole("button", { name: "Pokémon" }));

    expect(screen.getByRole("searchbox")).toHaveValue("Pokémon");
    const interventionResult = screen.getByRole("region", {
      name: "Search result: Feelings Jenga",
    });
    expect(
      within(interventionResult).getByRole("heading", { name: "Feelings Jenga" })
    ).toBeVisible();
    expect(
      within(interventionResult).getByText("Matched resource details: Pokémon")
    ).toBeVisible();
    expect(
      within(interventionResult).getByRole("link", {
        name: "Open Intervention",
      })
    ).toHaveAttribute("href", "/interventions/intervention-1");
  });

  it("adds a newly persisted Worksheet and links to its usable route", async () => {
    const user = userEvent.setup();
    const repository = persistedWorksheetSource();
    const created = await repository.createWorksheet({
      title: "Calm Body Map",
      description: "Notice grounding signals and plan a calming routine.",
      tags: ["grounding"],
    });
    renderWithRouter(
      <ResourceSearch persistedWorksheetRepository={repository} resources={resources} />
    );

    await user.type(screen.getByRole("searchbox"), "Calm Body Map{Enter}");

    const result = await screen.findByRole("region", {
      name: "Search result: Calm Body Map",
    });
    expect(within(result).getByRole("heading", { name: "Calm Body Map" })).toBeVisible();
    expect(within(result).getByRole("link", { name: "Open Worksheet" })).toHaveAttribute(
      "href",
      `/worksheets/${created.resource.id}`
    );
  });

  it("adds a persisted Intervention and links to its detail route", async () => {
    const user = userEvent.setup();
    const imported = {
      ...intervention,
      id: "imported-grounding",
      title: "Five Senses Grounding",
      archived: false,
      starter: false,
      createdAt: "2026-08-11T12:00:00.000Z",
      updatedAt: "2026-08-11T12:00:00.000Z",
    };
    renderWithRouter(
      <ResourceSearch
        persistedInterventionRepository={{
          getAllInterventions: vi.fn(async () => [imported]),
        }}
        resources={resources}
      />
    );
    await user.type(screen.getByRole("searchbox"), "Five Senses Grounding{Enter}");
    const result = await screen.findByRole("region", {
      name: "Search result: Five Senses Grounding",
    });
    expect(
      within(result).getByRole("link", { name: "Open Intervention" })
    ).toHaveAttribute("href", "/interventions/imported-grounding");
  });

  it("adds a persisted Trivia Set and links to its playable route", async () => {
    const user = userEvent.setup();
    const game = {
      ...generalKnowledgeTrivia,
      id: "saved-space-trivia",
      title: "Saved Space Trivia",
      archived: false,
    };
    renderWithRouter(
      <ResourceSearch
        persistedGameRepository={{ getAllResources: vi.fn(async () => [game]) }}
        resources={resources}
      />
    );
    await user.type(screen.getByRole("searchbox"), "Saved Space Trivia{Enter}");
    const result = await screen.findByRole("region", {
      name: "Search result: Saved Space Trivia",
    });
    expect(within(result).getByRole("link", { name: "Play Trivia" })).toHaveAttribute(
      "href",
      "/games/saved-space-trivia"
    );
  });

  it("finds Bingo by item text and links to its playable route", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ResourceSearch resources={[pictureWordBingo]} />);
    await user.type(screen.getByRole("searchbox"), "Sandcastle{Enter}");
    const result = await screen.findByRole("region", {
      name: `Search result: ${pictureWordBingo.title}`,
    });
    expect(within(result).getByRole("link", { name: "Play Bingo" })).toHaveAttribute(
      "href",
      `/games/${pictureWordBingo.id}`
    );
  });

  it("does not return a permanently deleted Worksheet", async () => {
    const user = userEvent.setup();
    const repository = persistedWorksheetSource();
    const created = await repository.createWorksheet({ title: "Temporary Worksheet" });
    await repository.deleteWorksheetPermanently(created.resource.id);
    renderWithRouter(
      <ResourceSearch persistedWorksheetRepository={repository} resources={resources} />
    );

    await user.type(screen.getByRole("searchbox"), "Temporary Worksheet{Enter}");

    expect(await screen.findByText(/results for “Temporary Worksheet”/i)).toBeVisible();
    expect(
      screen.queryByRole("region", { name: "Search result: Temporary Worksheet" })
    ).toBeNull();
  });

  it("filters mixed results by Resource type", async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <ResourceSearch
        persistedWorksheetRepository={worksheetSource()}
        resources={resources}
      />
    );

    await user.type(screen.getByRole("searchbox"), "rapport{Enter}");
    const typeFilter = await screen.findByRole("combobox", { name: "Resource Type" });
    expect(screen.getAllByRole("region", { name: /search result:/i })).toHaveLength(3);

    await user.selectOptions(typeFilter, "worksheet");

    expect(screen.getAllByRole("region", { name: /search result:/i })).toHaveLength(1);
    expect(
      screen.getByRole("region", { name: "Search result: Calm Body Map" })
    ).toBeVisible();
    expect(
      screen.queryByRole("region", { name: "Search result: Brave Questions" })
    ).toBeNull();
    expect(
      screen.queryByRole("region", { name: "Search result: Feelings Jenga" })
    ).toBeNull();
  });

  it("does not render a persisted Worksheet twice when sources overlap", async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <ResourceSearch
        persistedWorksheetRepository={worksheetSource()}
        resources={[...resources, worksheet]}
      />
    );

    await user.type(screen.getByRole("searchbox"), "Calm Body Map{Enter}");

    expect(
      await screen.findAllByRole("region", { name: "Search result: Calm Body Map" })
    ).toHaveLength(1);
  });

  it("keeps static search available when no Worksheets are stored", async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <ResourceSearch
        persistedWorksheetRepository={worksheetSource([])}
        resources={resources}
      />
    );

    await user.type(screen.getByRole("searchbox"), "brave{Enter}");

    expect(await screen.findByRole("heading", { name: "Brave Questions" })).toBeVisible();
  });

  it("reports a Worksheet-source failure while preserving static results", async () => {
    const user = userEvent.setup();
    const repository = {
      getAllWorksheets: vi.fn().mockRejectedValue(new Error("Unavailable")),
    };
    renderWithRouter(
      <ResourceSearch persistedWorksheetRepository={repository} resources={resources} />
    );

    expect(
      await screen.findByText(/saved worksheets are unavailable in search right now/i)
    ).toBeVisible();
    await user.type(screen.getByRole("searchbox"), "brave{Enter}");
    expect(screen.getByRole("heading", { name: "Brave Questions" })).toBeVisible();
  });

  it("shows ranked results and links prompt decks to their usable route", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ResourceSearch resources={resources} />);

    await user.type(screen.getByRole("searchbox"), "rapport{Enter}");

    const results = screen.getAllByRole("region", { name: /search result:/i });
    expect(results).toHaveLength(2);
    expect(
      within(results[0]).getByRole("heading", { name: "Brave Questions" })
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /open deck/i })).toHaveAttribute(
      "href",
      "/prompts/deck-1"
    );
  });

  it("shows an empty state", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ResourceSearch resources={resources} />);

    await user.type(screen.getByRole("searchbox"), "astronautical{Enter}");

    expect(screen.getByText(/0 results for “astronautical”/i)).toBeVisible();
    expect(
      screen.getByRole("heading", { name: /no resources match that search/i })
    ).toBeVisible();
  });

  it("clears the query and results", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ResourceSearch resources={resources} />);

    await user.type(screen.getByRole("searchbox"), "rapport{Enter}");
    await user.click(screen.getByRole("button", { name: /clear search/i }));

    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.queryByText(/results for/i)).toBeNull();
  });

  it("renders and removes transparent Current Session explanations", async () => {
    const user = userEvent.setup();
    useCurrentSessionStore.getState().updateField("interests", "Pokémon");
    renderWithRouter(<ResourceSearch resources={resources} />);

    await user.type(screen.getByRole("searchbox"), "rapport{Enter}");
    const interventionResult = screen.getByRole("region", {
      name: "Search result: Feelings Jenga",
    });
    expect(
      within(interventionResult).getByText("Matches interest: Pokémon")
    ).toBeVisible();

    act(() => useCurrentSessionStore.getState().clearContext());
    expect(
      within(interventionResult).queryByText("Matches interest: Pokémon")
    ).toBeNull();
  });
});
