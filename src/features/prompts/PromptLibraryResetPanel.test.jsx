import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "../../test/test-utils";
import PromptLibraryResetPanel from "./PromptLibraryResetPanel";

const download = vi.fn();
vi.mock("./downloadPromptLibraryRecovery", () => ({
  downloadPromptLibraryRecovery: (...args) => download(...args),
}));

function authoring({ snapshot, preview } = {}) {
  return {
    repositories: {
      decks: {
        createPromptLibraryRecoverySnapshot: vi.fn(async () => {
          if (snapshot instanceof Error) throw snapshot;
          return snapshot ?? { exportedAt: "2026-08-19T12:00:00.000Z" };
        }),
        previewPromptLibraryReset: vi.fn(
          async () =>
            preview ?? {
              accountOwnedDeckCount: 1,
              activeDeckCount: 2,
              archivedDeckCount: 0,
              bundledStarterCount: 137,
              conflictCount: 0,
              localOnlyDeckCount: 1,
              syncStatus: "saved",
              unsyncedCount: 0,
            }
        ),
        resetPromptLibrary: vi.fn(async () => ({ removedDeckIds: [] })),
      },
    },
    run: vi.fn((operation) => operation()),
  };
}

describe("PromptLibraryResetPanel", () => {
  it("aborts before showing confirmation when recovery export creation fails", async () => {
    const user = userEvent.setup();
    const value = authoring({ snapshot: new Error("download unavailable") });
    renderWithRouter(<PromptLibraryResetPanel authoring={value} />);

    await user.click(screen.getByRole("button", { name: "Review reset" }));

    expect(value.repositories.decks.previewPromptLibraryReset).not.toHaveBeenCalled();
    expect(value.repositories.decks.resetPromptLibrary).not.toHaveBeenCalled();
    expect(screen.getByText(/recovery file could not be created/i)).toBeVisible();
  });

  it("downloads recovery before enabling a healthy reset confirmation", async () => {
    const user = userEvent.setup();
    const value = authoring();
    renderWithRouter(<PromptLibraryResetPanel authoring={value} />);

    await user.click(screen.getByRole("button", { name: "Review reset" }));

    expect(download).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Reset Prompt Library" })).toBeEnabled();
  });

  it("does not enable confirmation when the account is offline or conflicted", async () => {
    const user = userEvent.setup();
    const value = authoring({
      preview: {
        accountOwnedDeckCount: 1,
        activeDeckCount: 1,
        archivedDeckCount: 0,
        bundledStarterCount: 137,
        conflictCount: 1,
        localOnlyDeckCount: 0,
        syncStatus: "offline-saved-locally",
        unsyncedCount: 1,
      },
    });
    renderWithRouter(<PromptLibraryResetPanel authoring={value} />);

    await user.click(screen.getByRole("button", { name: "Review reset" }));

    expect(screen.getByRole("button", { name: "Reset Prompt Library" })).toBeDisabled();
  });
});
