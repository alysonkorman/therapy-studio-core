import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import SceneFileControls from "./SceneFileControls";
import { initialWorkspaceDocument } from "./workspaceDocument";

const sceneDocument = {
  documentVersion: 1,
  background: "sand",
  objects: [
    {
      id: "dog-object",
      assetId: "animals/dog",
      assetKind: "icon",
      label: "Dog",
      x: 42,
      y: 81,
      width: 180,
      height: 120,
      rotation: -35,
    },
  ],
};

function savedScene(overrides = {}) {
  return {
    id: "scene-1",
    documentVersion: 1,
    title: "Sand Story",
    workspaceDocument: sceneDocument,
    createdAt: "2026-08-09T20:00:00.000Z",
    updatedAt: "2026-08-09T20:00:00.000Z",
    ...overrides,
  };
}

describe("SceneFileControls", () => {
  it("saves only the supplied shared workspace document", async () => {
    const user = userEvent.setup();
    const repository = {
      getScene: vi.fn(),
      listScenes: vi.fn().mockResolvedValue([]),
      saveScene: vi.fn().mockResolvedValue(savedScene()),
    };
    render(
      <SceneFileControls
        document={sceneDocument}
        emptyDocument={initialWorkspaceDocument}
        onLoad={vi.fn()}
        onNew={vi.fn()}
        repository={repository}
      />
    );

    await user.clear(screen.getByRole("textbox", { name: "Scene title" }));
    await user.type(screen.getByRole("textbox", { name: "Scene title" }), "Sand Story");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(repository.saveScene).toHaveBeenCalledWith({
        id: null,
        title: "Sand Story",
        workspaceDocument: sceneDocument,
      })
    );
  });

  it("requires one inline confirmation before discarding unsaved work", async () => {
    const user = userEvent.setup();
    const onNew = vi.fn();
    render(
      <SceneFileControls
        document={sceneDocument}
        emptyDocument={initialWorkspaceDocument}
        onLoad={vi.fn()}
        onNew={onNew}
        repository={{ listScenes: vi.fn().mockResolvedValue([]) }}
      />
    );

    await user.click(screen.getByRole("button", { name: "New" }));
    expect(onNew).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Start New Scene?" }));
    expect(onNew).toHaveBeenCalledOnce();
  });

  it("opens a saved shared document without restoring participant-local UI", async () => {
    const user = userEvent.setup();
    const scene = savedScene();
    const onLoad = vi.fn();
    const repository = {
      getScene: vi.fn().mockResolvedValue(scene),
      listScenes: vi.fn().mockResolvedValue([scene]),
    };
    render(
      <SceneFileControls
        document={initialWorkspaceDocument}
        emptyDocument={initialWorkspaceDocument}
        onLoad={onLoad}
        onNew={vi.fn()}
        repository={repository}
      />
    );

    await screen.findByRole("option", { name: "Sand Story" });
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Saved scenes" }),
      "scene-1"
    );
    await user.click(screen.getByRole("button", { name: "Open" }));

    await waitFor(() => expect(onLoad).toHaveBeenCalledWith(sceneDocument));
  });
});
