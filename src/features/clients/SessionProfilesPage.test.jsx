import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSessionProfile } from "../../models/sessionProfile";
import { useActiveSessionProfileStore } from "../../stores/activeSessionProfileStore";
import { renderWithRouter } from "../../test/test-utils";
import ClientsPage from "./ClientsPage";

const profile = createSessionProfile(
  { displayName: "Dinosaur Kid", interests: ["Dinosaurs"] },
  { id: "profile-1", now: "2026-08-04T12:00:00.000Z" }
);
function repository(initial = []) {
  let profiles = [...initial];
  return {
    searchSessionProfiles: vi.fn(async (query, { includeArchived }) =>
      profiles.filter(
        (item) =>
          (includeArchived || !item.archived) &&
          item.displayName.toLowerCase().includes(query.toLowerCase())
      )
    ),
    createSessionProfile: vi.fn(async (input) => {
      const created = { ...profile, ...input, id: "new-profile" };
      profiles.push(created);
      return created;
    }),
    updateSessionProfile: vi.fn(async (id, changes) => {
      profiles = profiles.map((item) =>
        item.id === id ? { ...item, ...changes } : item
      );
    }),
    duplicateSessionProfile: vi.fn(async () => profile),
    archiveSessionProfile: vi.fn(async () => profile),
    restoreSessionProfile: vi.fn(async () => profile),
    deleteSessionProfilePermanently: vi.fn(async () => {}),
    markSessionProfileOpened: vi.fn(async () => profile),
  };
}
beforeEach(() =>
  useActiveSessionProfileStore.setState({ activeProfileId: null, activeProfile: null })
);

describe("Session Profiles page", () => {
  it("replaces the placeholder with privacy guidance and an empty state", async () => {
    renderWithRouter(<ClientsPage repository={repository()} />, {
      initialEntries: ["/clients"],
    });
    expect(
      screen.getByRole("heading", { name: "Session Profiles", level: 1 })
    ).toBeVisible();
    expect(
      screen.getByText(/do not enter identifying client information/i)
    ).toBeVisible();
    expect(
      await screen.findByRole("heading", { name: /no session profiles found/i })
    ).toBeVisible();
    expect(screen.queryByText(/legal name|date of birth|email address/i)).toBeNull();
  });
  it("creates a profile and keeps advanced fields collapsed while preserving drafts", async () => {
    const user = userEvent.setup();
    const repo = repository();
    renderWithRouter(<ClientsPage repository={repo} />);
    await user.click(screen.getByRole("button", { name: /create profile/i }));
    expect(screen.queryByRole("button", { name: /create profile/i })).toBeNull();
    expect(screen.getByRole("button", { name: /save session profile/i })).toBeVisible();
    expect(screen.queryByLabelText(/reading tolerance/i)).toBeNull();
    await user.type(screen.getByLabelText(/profile name/i), "Art and Animals");
    await user.click(screen.getByRole("button", { name: /show advanced context/i }));
    const reading = screen.getByLabelText(/reading tolerance/i);
    await user.type(reading, "Short passages");
    await user.click(screen.getByRole("button", { name: /hide advanced context/i }));
    await user.click(screen.getByRole("button", { name: /show advanced context/i }));
    expect(screen.getByLabelText(/reading tolerance/i)).toHaveValue("Short passages");
    await user.click(screen.getByRole("button", { name: /save session profile/i }));
    expect(repo.createSessionProfile).toHaveBeenCalled();
  });
  it("searches and exposes compact management actions", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ClientsPage repository={repository([profile])} />);
    expect(await screen.findByRole("heading", { name: "Dinosaur Kid" })).toBeVisible();
    await user.type(screen.getByPlaceholderText(/search profiles/i), "missing");
    expect(await screen.findByText(/try a different search/i)).toBeVisible();
  });
});
