export function addWhiteboardObject(document, object) {
  return { ...document, objects: [...document.objects, object] };
}

export function updateWhiteboardObject(document, objectId, changes) {
  return {
    ...document,
    objects: document.objects.map((object) =>
      object.id === objectId ? { ...object, ...changes } : object
    ),
  };
}

export function deleteWhiteboardObject(document, objectId) {
  return {
    ...document,
    objects: document.objects.filter(({ id }) => id !== objectId),
  };
}

export function duplicateWhiteboardObject(document, objectId, duplicateId) {
  const source = document.objects.find(({ id }) => id === objectId);
  if (!source) return document;
  const position =
    source.kind === "arrow"
      ? {
          x1: source.x1 + 20,
          y1: source.y1 + 20,
          x2: source.x2 + 20,
          y2: source.y2 + 20,
        }
      : { x: source.x + 20, y: source.y + 20 };
  const duplicate = {
    ...structuredClone(source),
    ...position,
    id: duplicateId,
    ...(source.kind === "image" ? { background: false } : {}),
  };
  return { ...document, objects: [...document.objects, duplicate] };
}

export function moveWhiteboardObjectLayer(document, objectId, direction) {
  const index = document.objects.findIndex(({ id }) => id === objectId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= document.objects.length)
    return document;
  const objects = [...document.objects];
  [objects[index], objects[nextIndex]] = [objects[nextIndex], objects[index]];
  return { ...document, objects };
}

export function clearWhiteboard(document) {
  return { ...document, objects: [] };
}

export function resetWhiteboardMarks(document) {
  return {
    ...document,
    objects: document.objects.filter(
      ({ kind, background }) => kind === "image" && background
    ),
  };
}

export function setWhiteboardImageBackground(document, objectId) {
  return {
    ...document,
    objects: document.objects.map((object) =>
      object.kind === "image"
        ? {
            ...object,
            background: object.id === objectId,
            locked: object.id === objectId ? true : object.locked,
          }
        : object
    ),
  };
}

export function createHistory(document) {
  return { past: [], present: document, future: [] };
}

export function commitHistory(history, document) {
  if (document === history.present) return history;
  return { past: [...history.past, history.present], present: document, future: [] };
}

export function undoHistory(history) {
  if (!history.past.length) return history;
  const previous = history.past.at(-1);
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoHistory(history) {
  if (!history.future.length) return history;
  const [next, ...future] = history.future;
  return { past: [...history.past, history.present], present: next, future };
}
