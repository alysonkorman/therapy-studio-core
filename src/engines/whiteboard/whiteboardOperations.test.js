import { describe, expect, it } from "vitest";

import {
  addWhiteboardObject,
  clearWhiteboard,
  commitHistory,
  createHistory,
  deleteWhiteboardObject,
  redoHistory,
  undoHistory,
  updateWhiteboardObject,
} from "./whiteboardOperations";

const document = { id: "board", objects: [] };
const text = { id: "text", kind: "text", text: "Hello" };

describe("Whiteboard operations", () => {
  it("adds, updates, deletes, and clears objects without mutating the source", () => {
    const added = addWhiteboardObject(document, text);
    const updated = updateWhiteboardObject(added, text.id, { text: "Updated" });
    expect(document.objects).toEqual([]);
    expect(updated.objects[0].text).toBe("Updated");
    expect(deleteWhiteboardObject(updated, text.id).objects).toEqual([]);
    expect(clearWhiteboard(added).objects).toEqual([]);
  });

  it("supports deterministic undo and redo", () => {
    const history = commitHistory(
      createHistory(document),
      addWhiteboardObject(document, text)
    );
    expect(undoHistory(history).present.objects).toEqual([]);
    expect(redoHistory(undoHistory(history)).present.objects).toEqual([text]);
  });
});
