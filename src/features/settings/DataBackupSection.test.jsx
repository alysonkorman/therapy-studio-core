import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "../../test/test-utils";
import DataBackupSection from "./DataBackupSection";

const timestamp = "2026-08-09T12:00:00.000Z";
const backup = {
  format: "therapy-studio-backup",
  version: 1,
  exportedAt: timestamp,
  databaseVersion: 8,
  data: {
    resources: [],
    categories: [],
    playlists: [],
    resourceMemory: [],
    sessionProfiles: [],
    worksheetDocuments: [],
    interventionGuidance: [],
    whiteboardDocuments: [],
  },
};

beforeEach(() => {
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:backup"),
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

describe("DataBackupSection", () => {
  it("downloads a local JSON backup with a dated filename", async () => {
    const user = userEvent.setup();
    const repository = { exportBackup: vi.fn(async () => backup) };
    renderWithRouter(<DataBackupSection repository={repository} />);

    await user.click(screen.getByRole("button", { name: "Export Backup" }));

    expect(repository.exportBackup).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(screen.getByRole("status")).toHaveTextContent("downloaded");
  });

  it("validates a selected backup and requires confirmation before restore", async () => {
    const user = userEvent.setup();
    const repository = {
      exportBackup: vi.fn(),
      restoreBackup: vi.fn(async () => ({})),
    };
    renderWithRouter(<DataBackupSection repository={repository} />);
    const file = new File([JSON.stringify(backup)], "backup.json", {
      type: "application/json",
    });

    await user.upload(screen.getByLabelText("Choose Therapy Studio backup file"), file);

    expect(repository.restoreBackup).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Replace local Therapy Studio data?" })
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Replace Local Data" }));
    expect(repository.restoreBackup).toHaveBeenCalledWith(backup);
    expect(screen.getByRole("status")).toHaveTextContent("Backup restored");
  });

  it("cancels restore without changing data and explains invalid files", async () => {
    const user = userEvent.setup();
    const repository = { exportBackup: vi.fn(), restoreBackup: vi.fn() };
    renderWithRouter(<DataBackupSection repository={repository} />);
    const input = screen.getByLabelText("Choose Therapy Studio backup file");

    await user.upload(input, new File([JSON.stringify(backup)], "backup.json"));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(repository.restoreBackup).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("heading", { name: "Replace local Therapy Studio data?" })
    ).not.toBeInTheDocument();

    await user.upload(input, new File(["not-json"], "notes.json"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Therapy Studio could not read this backup file"
    );
  });

  it("states the browser-only and sensitive-data boundaries", () => {
    renderWithRouter(<DataBackupSection repository={{}} />);
    expect(
      screen.getByText("Data is currently stored only in this browser.")
    ).toBeVisible();
    expect(screen.getByText(/private clinical information/i)).toBeVisible();
    expect(screen.getByText(/does not upload it/i)).toBeVisible();
  });
});
