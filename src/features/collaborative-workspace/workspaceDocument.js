import { nanoid } from "nanoid";

export const initialWorkspaceDocument = Object.freeze({
  documentVersion: 1,
  background: "outdoors",
  objects: [],
});

const defaultPlacement = { x: 280, y: 210, width: 136, height: 136, rotation: 0 };

export function calculateInitialWorkspaceObjectSize(aspectRatio = 1, longestSide = 160) {
  return aspectRatio >= 1
    ? { width: longestSide, height: longestSide / aspectRatio }
    : { width: longestSide * aspectRatio, height: longestSide };
}

export function addWorkspaceObject(document, asset, overrides = {}) {
  const nextObject = {
    id: overrides.id ?? nanoid(),
    assetId: asset.id,
    assetKind: asset.assetKind ?? "emoji",
    label: asset.label,
    symbol: asset.symbol,
    color: asset.color,
    ...defaultPlacement,
    ...overrides,
  };
  return { ...document, objects: [...document.objects, nextObject] };
}

export function updateWorkspaceObject(document, objectId, changes) {
  return {
    ...document,
    objects: document.objects.map((object) =>
      object.id === objectId ? { ...object, ...changes } : object
    ),
  };
}

export function deleteWorkspaceObject(document, objectId) {
  return {
    ...document,
    objects: document.objects.filter((object) => object.id !== objectId),
  };
}

export function duplicateWorkspaceObject(document, objectId, createId = nanoid) {
  const index = document.objects.findIndex((object) => object.id === objectId);
  if (index < 0) return document;
  const source = document.objects[index];
  const copy = { ...source, id: createId(), x: source.x + 24, y: source.y + 24 };
  return {
    ...document,
    objects: [
      ...document.objects.slice(0, index + 1),
      copy,
      ...document.objects.slice(index + 1),
    ],
  };
}

export function moveWorkspaceObjectLayer(document, objectId, direction) {
  const index = document.objects.findIndex((object) => object.id === objectId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= document.objects.length) return document;
  const objects = [...document.objects];
  [objects[index], objects[target]] = [objects[target], objects[index]];
  return { ...document, objects };
}

export function updateWorkspaceBackground(document, background) {
  return { ...document, background };
}

export function workspaceDocumentReducer(document, action) {
  switch (action.type) {
    case "background/update":
      return updateWorkspaceBackground(document, action.background);
    case "object/add":
      return addWorkspaceObject(document, action.asset, action.overrides);
    case "object/update":
      return updateWorkspaceObject(document, action.objectId, action.changes);
    case "object/delete":
      return deleteWorkspaceObject(document, action.objectId);
    case "object/duplicate":
      return duplicateWorkspaceObject(document, action.objectId);
    case "object/layer":
      return moveWorkspaceObjectLayer(document, action.objectId, action.direction);
    default:
      return document;
  }
}
