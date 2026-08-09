import { describe, expect, it } from "vitest";

import {
  addWorkspaceObject,
  calculateInitialWorkspaceObjectSize,
  deleteWorkspaceObject,
  duplicateWorkspaceObject,
  initialWorkspaceDocument,
  moveWorkspaceObjectLayer,
  updateWorkspaceBackground,
  updateWorkspaceObject,
} from "./workspaceDocument";

const dog = { id: "dog", label: "Dog", symbol: "🐕", color: "orange" };
const tree = { id: "tree", label: "Tree", symbol: "🌳", color: "green" };

describe("workspace document operations", () => {
  it("adds and updates an object without mutating the source document", () => {
    const added = addWorkspaceObject(initialWorkspaceDocument, dog, { id: "dog-1" });
    const moved = updateWorkspaceObject(added, "dog-1", { x: 42, rotation: 15 });

    expect(initialWorkspaceDocument.objects).toHaveLength(0);
    expect(moved.objects[0]).toMatchObject({ assetId: "dog", x: 42, rotation: 15 });
  });

  it("duplicates with a new id and visible offset", () => {
    const document = addWorkspaceObject(initialWorkspaceDocument, dog, {
      id: "dog-1",
      x: 10,
      y: 20,
    });
    const duplicated = duplicateWorkspaceObject(document, "dog-1", () => "dog-2");

    expect(duplicated.objects).toHaveLength(2);
    expect(duplicated.objects[1]).toMatchObject({ id: "dog-2", x: 34, y: 44 });
  });

  it("deletes and changes layer order", () => {
    let document = addWorkspaceObject(initialWorkspaceDocument, dog, { id: "dog-1" });
    document = addWorkspaceObject(document, tree, { id: "tree-1" });
    const reordered = moveWorkspaceObjectLayer(document, "tree-1", -1);

    expect(reordered.objects.map(({ id }) => id)).toEqual(["tree-1", "dog-1"]);
    expect(
      deleteWorkspaceObject(reordered, "tree-1").objects.map(({ id }) => id)
    ).toEqual(["dog-1"]);
  });

  it("changes the shared scene background", () => {
    const changed = updateWorkspaceBackground(initialWorkspaceDocument, "room");

    expect(changed.background).toBe("room");
    expect(initialWorkspaceDocument.background).toBe("outdoors");
  });

  it("stores a stable icon reference without SVG markup", () => {
    const icon = {
      id: "curated-animals-creatures-pets-dog",
      label: "Dog",
      assetKind: "icon",
    };
    const document = addWorkspaceObject(initialWorkspaceDocument, icon, {
      id: "scene-dog",
      width: 160,
      height: 120,
    });

    expect(document.objects[0]).toMatchObject({
      assetId: icon.id,
      assetKind: "icon",
      width: 160,
      height: 120,
    });
    expect(JSON.stringify(document.objects[0])).not.toContain("<svg");
  });

  it("creates proportional initial sizes for wide and tall artwork", () => {
    expect(calculateInitialWorkspaceObjectSize(2)).toEqual({ width: 160, height: 80 });
    expect(calculateInitialWorkspaceObjectSize(0.5)).toEqual({ width: 80, height: 160 });
  });
});
