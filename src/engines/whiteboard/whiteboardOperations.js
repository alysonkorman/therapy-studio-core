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
