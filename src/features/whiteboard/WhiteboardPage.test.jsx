import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createBlankWhiteboardDocument } from "../../models";
import { renderWithRouter } from "../../test/test-utils";
import WhiteboardPage from "./WhiteboardPage";

const now = "2026-08-11T12:00:00.000Z";

function repository(saved = []) {
  return {
    listWhiteboards: vi.fn(async () => saved),
    saveWhiteboard: vi.fn(async (document) => ({ ...document, updatedAt: now })),
  };
}

function mediaRepository() {
  return {
    saveAsset: vi.fn(async ({ blob, width, height, accessibilityLabel }) => ({
      id: "activity-asset",
      mimeType: blob.type,
      width,
      height,
      size: blob.size,
      accessibilityLabel,
      createdAt: now,
    })),
    getAsset: vi.fn(async () => null),
    deleteAsset: vi.fn(async () => {}),
  };
}

function renderPage(options = {}) {
  return renderWithRouter(
    <WhiteboardPage
      collaborationFactory={() => ({ close() {}, publish: vi.fn() })}
      createId={() => crypto.randomUUID()}
      mediaRepository={options.mediaRepository ?? mediaRepository()}
      repository={options.repository ?? repository()}
    />
  );
}

function renderParticipantPage(options = {}) {
  return renderWithRouter(
    <WhiteboardPage
      collaborationFactory={() => ({ close() {}, publish: vi.fn() })}
      createId={() => crypto.randomUUID()}
      liveSession={{ role: "participant", sessionId: "participant-session" }}
      mediaRepository={options.mediaRepository ?? mediaRepository()}
      repository={options.repository ?? repository()}
    />
  );
}

describe("WhiteboardPage", () => {
  it("starts a fresh editable Feelings Thermometer in one click", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole("heading", { name: "Start With…" })).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Use Now: Feelings Thermometer" })
    );

    expect(screen.queryByRole("heading", { name: "Start With…" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Rectangle object" })).toHaveLength(5);
    expect(screen.getByRole("textbox", { name: "Whiteboard title" })).toHaveValue(
      "Feelings Thermometer — Session Copy"
    );
    expect(screen.getByText("Feelings Thermometer is ready to use.")).toHaveTextContent(
      "Feelings Thermometer is ready to use."
    );

    await user.click(
      screen.getAllByRole("button", { name: "Text object: Type an example…" })[0]
    );
    const text = screen.getByRole("textbox", { name: "Selected text" });
    fireEvent.change(text, { target: { value: "Cats" } });
    expect(screen.getByLabelText("Text object: Cats")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getAllByLabelText("Text object: Type an example…")).toHaveLength(5);
  });

  it("offers selected-object duplication and layer controls", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(
      screen.getByRole("button", { name: "Use Now: Feelings Thermometer" })
    );
    await user.click(
      screen.getAllByRole("button", { name: "Text object: Type an example…" })[0]
    );

    expect(screen.getByRole("button", { name: "Backward" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Forward" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Duplicate" }));

    expect(screen.getAllByLabelText("Text object: Type an example…")).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Forward" })).toBeDisabled();
  });

  it("offers the Shield and Blank Canvas through the same starter flow", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();

    await user.click(screen.getByRole("button", { name: "Use Now: Blank Shield" }));
    expect(screen.getByLabelText("Drawing stroke")).toBeVisible();
    expect(screen.getByLabelText(/Text object: Make this shield/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Start With…" }));
    await user.click(screen.getByRole("button", { name: "Use Now: Blank Canvas" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText("Drawing stroke")).toBeNull();
    expect(screen.getByRole("textbox", { name: "Whiteboard title" })).toHaveValue(
      "Blank Canvas — Session Copy"
    );
    confirm.mockRestore();
  });

  it("saves a starter instance through the normal Whiteboard repository", async () => {
    const user = userEvent.setup();
    const data = repository();
    renderPage({ repository: data });

    await user.click(
      screen.getByRole("button", { name: "Use Now: Feelings Thermometer" })
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(data.saveWhiteboard).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Feelings Thermometer — Session Copy",
        objects: expect.arrayContaining([expect.objectContaining({ kind: "rectangle" })]),
      })
    );
  });

  it("draws, erases, and supports undo and redo", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Draw" }));
    const canvas = screen.getByRole("img", { name: "Whiteboard canvas" });
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 100 });
    fireEvent.pointerMove(canvas, { clientX: 250, clientY: 100 });
    fireEvent.pointerUp(canvas);
    expect(screen.getByLabelText("Drawing stroke")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByLabelText("Drawing stroke")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByLabelText("Drawing stroke")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Eraser" }));
    fireEvent.pointerDown(canvas, {
      clientX: 130,
      clientY: 100,
      pointerId: 4,
      isPrimary: true,
      pointerType: "touch",
    });
    fireEvent.pointerMove(canvas, {
      clientX: 132,
      clientY: 100,
      pointerId: 4,
      isPrimary: true,
      pointerType: "touch",
    });
    fireEvent.pointerUp(canvas, { isPrimary: true, pointerId: 4, pointerType: "touch" });
    expect(screen.getAllByLabelText("Drawing stroke")).toHaveLength(2);
  });

  it("keeps a touch stroke owned by its first pointer and cancels it safely", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Draw" }));
    const canvas = screen.getByRole("img", { name: "Whiteboard canvas" });

    fireEvent.pointerDown(canvas, {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      isPrimary: true,
      pointerType: "touch",
    });
    fireEvent.pointerMove(canvas, {
      clientX: 20,
      clientY: 20,
      pointerId: 1,
      isPrimary: true,
      pointerType: "touch",
    });
    fireEvent.pointerDown(canvas, {
      clientX: 700,
      clientY: 600,
      pointerId: 2,
      isPrimary: false,
      pointerType: "touch",
    });
    fireEvent.pointerMove(canvas, {
      clientX: 800,
      clientY: 600,
      pointerId: 2,
      isPrimary: false,
      pointerType: "touch",
    });
    fireEvent.pointerUp(canvas, { isPrimary: false, pointerId: 2, pointerType: "touch" });
    fireEvent.pointerMove(canvas, {
      clientX: 30,
      clientY: 30,
      pointerId: 1,
      isPrimary: true,
      pointerType: "touch",
    });
    fireEvent.pointerUp(canvas, { isPrimary: true, pointerId: 1, pointerType: "touch" });

    expect(screen.getByLabelText("Drawing stroke").getAttribute("points")).toBe(
      "10,10 20,20 30,30"
    );
    fireEvent.pointerDown(canvas, {
      clientX: 40,
      clientY: 40,
      pointerId: 3,
      isPrimary: true,
      pointerType: "touch",
    });
    fireEvent.pointerCancel(canvas, {
      isPrimary: true,
      pointerId: 3,
      pointerType: "touch",
    });
    expect(screen.getAllByLabelText("Drawing stroke")).toHaveLength(1);
  });

  it("creates and edits text, then deletes the selected object", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Text" }));
    fireEvent.pointerDown(screen.getByRole("img", { name: "Whiteboard canvas" }), {
      clientX: 100,
      clientY: 100,
    });
    const editor = screen.getByRole("textbox", { name: "Selected text" });
    await user.clear(editor);
    await user.type(editor, "Feelings Map");
    expect(screen.getByLabelText("Text object: Feelings Map")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete Selected" }));
    expect(screen.queryByLabelText("Text object: Feelings Map")).toBeNull();
  });

  it("creates, styles, moves, resizes, persists, and undoes shapes and arrows", async () => {
    const user = userEvent.setup();
    const data = repository();
    renderPage({ repository: data });
    const canvas = screen.getByRole("img", { name: "Whiteboard canvas" });

    await user.click(screen.getByRole("button", { name: "Rectangle" }));
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { clientX: 300, clientY: 220 });
    fireEvent.pointerUp(canvas);
    expect(screen.getByRole("button", { name: "Rectangle object" })).toBeVisible();
    fireEvent.change(screen.getByRole("combobox", { name: "Fill color" }), {
      target: { value: "#E4B83F" },
    });

    await user.click(screen.getByRole("button", { name: "Arrow" }));
    fireEvent.pointerDown(canvas, { clientX: 300, clientY: 220 });
    fireEvent.pointerMove(canvas, { clientX: 500, clientY: 350 });
    fireEvent.pointerUp(canvas);
    expect(screen.getByRole("button", { name: "Arrow object" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Select" }));
    const arrow = screen.getByRole("button", { name: "Arrow object" });
    fireEvent.pointerDown(arrow, { clientX: 300, clientY: 220 });
    fireEvent.pointerMove(canvas, { clientX: 340, clientY: 260 });
    fireEvent.pointerUp(canvas);
    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Resize selected object" }),
      {
        clientX: 500,
        clientY: 350,
      }
    );
    fireEvent.pointerMove(canvas, { clientX: 600, clientY: 420 });
    fireEvent.pointerUp(canvas);

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(data.saveWhiteboard).toHaveBeenCalledWith(
      expect.objectContaining({
        objects: expect.arrayContaining([
          expect.objectContaining({ kind: "rectangle", fillColor: "#E4B83F" }),
          expect.objectContaining({ kind: "arrow" }),
        ]),
      })
    );
    await user.click(screen.getByRole("button", { name: "Undo" }));
    await user.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByRole("button", { name: "Arrow object" })).toBeVisible();
  });

  it("provides compact pan and zoom controls", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByRole("status", { name: "Zoom percentage" })).toHaveTextContent(
      "100%"
    );
    await user.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByRole("status", { name: "Zoom percentage" })).toHaveTextContent(
      "110%"
    );
    await user.click(screen.getByRole("button", { name: "Pan" }));
    expect(screen.getByRole("button", { name: "Pan" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("requires confirmation before clearing or replacing a used board", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderPage();
    await user.click(screen.getByRole("button", { name: "Text" }));
    fireEvent.pointerDown(screen.getByRole("img", { name: "Whiteboard canvas" }));
    await user.click(screen.getByRole("button", { name: "Clear All" }));
    expect(screen.getByLabelText(/Text object/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "New" }));
    expect(screen.getByLabelText(/Text object/)).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledTimes(2);
    confirm.mockRestore();
  });

  it("saves, lists, and reopens local Whiteboards", async () => {
    const user = userEvent.setup();
    const saved = createBlankWhiteboardDocument({
      id: "saved",
      now,
      title: "Saved Board",
    });
    const data = repository([saved]);
    renderPage({ repository: data });
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(data.saveWhiteboard).toHaveBeenCalled();
    expect(await screen.findByText("Whiteboard saved locally.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByRole("button", { name: "Saved Board" }));
    expect(screen.getByRole("textbox", { name: "Whiteboard title" })).toHaveValue(
      "Saved Board"
    );
  });

  it("reopens, moves, resizes, and deletes a visual with fallback rendering", async () => {
    const user = userEvent.setup();
    const saved = {
      ...createBlankWhiteboardDocument({ id: "saved", now, title: "Visual Board" }),
      objects: [
        {
          id: "visual",
          kind: "visual",
          iconId: "missing-whiteboard-icon",
          x: 100,
          y: 100,
          width: 100,
          height: 100,
        },
      ],
    };
    renderPage({ repository: repository([saved]) });
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByRole("button", { name: "Visual Board" }));
    await user.click(screen.getByRole("button", { name: "Select" }));
    const visual = screen.getByRole("button", { name: "Visual object" });
    fireEvent.pointerDown(visual, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(screen.getByRole("img", { name: "Whiteboard canvas" }), {
      clientX: 150,
      clientY: 150,
    });
    fireEvent.pointerUp(screen.getByRole("img", { name: "Whiteboard canvas" }));
    fireEvent.change(screen.getByRole("slider", { name: "Visual Size" }), {
      target: { value: "180" },
    });
    expect(visual).toHaveAttribute("width", "180");
    expect(document.querySelector(".whiteboard-visual .lucide-shapes")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Delete Selected" }));
    expect(screen.queryByRole("button", { name: "Visual object" })).toBeNull();
  });

  it("places a curated SVG through the shared Icon Browser", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Add Visual" }));
    await user.click(
      screen.getByRole("button", { name: "Choose Visual for Whiteboard Visual" })
    );
    await user.type(screen.getByRole("searchbox", { name: "Search Icons" }), "watarun01");
    await user.dblClick(screen.getByRole("button", { name: /select watarun01/i }));
    expect(screen.getByRole("button", { name: "Visual object" })).toBeInTheDocument();
  });

  it("lets a participant add a semantic sticker as a normal movable visual", async () => {
    const user = userEvent.setup();
    renderParticipantPage();

    await user.click(screen.getByRole("button", { name: "Stickers" }));
    expect(screen.getByRole("dialog", { name: "Choose a sticker" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Animals" }));
    await user.click(screen.getAllByRole("button", { name: /add .+ sticker/i })[0]);

    expect(screen.queryByRole("dialog", { name: "Choose a sticker" })).toBeNull();
    expect(screen.getByRole("button", { name: "Visual object" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Resize selected object" })).toBeVisible();
  });

  it("does not render therapist-private Resource Memory in the canvas", () => {
    renderPage();
    expect(screen.queryByText(/private notes|resource memory/i)).toBeNull();
    expect(screen.getByText(/Safe for screen sharing/i)).toBeVisible();
  });

  it("opens an image as a locked activity and resets only added marks", async () => {
    const user = userEvent.setup();
    const media = mediaRepository();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 1200, height: 800, close: vi.fn() }))
    );
    renderPage({ mediaRepository: media });

    await user.click(screen.getByRole("button", { name: "Add Activity" }));
    await user.upload(
      screen.getByLabelText("Activity file"),
      new File(["image"], "maze.png", { type: "image/png" })
    );
    await user.click(screen.getByRole("button", { name: "Open as Activity" }));

    expect(media.saveAsset).toHaveBeenCalledOnce();
    expect(screen.getByText(/Activity is ready/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Draw" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Unlock Background" })).toBeVisible();

    const canvas = screen.getByRole("img", { name: "Whiteboard canvas" });
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(canvas, { clientX: 30, clientY: 30 });
    fireEvent.pointerUp(canvas);
    expect(screen.getByLabelText("Drawing stroke")).toBeVisible();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Reset Marks" }));
    expect(screen.queryByLabelText("Drawing stroke")).toBeNull();
    expect(screen.getByRole("button", { name: "Unlock Background" })).toBeVisible();
    vi.unstubAllGlobals();
  });

  it("inserts an image as an object and saves its stable asset reference", async () => {
    const user = userEvent.setup();
    const media = mediaRepository();
    const data = repository();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 600, height: 900, close: vi.fn() }))
    );
    renderPage({ mediaRepository: media, repository: data });

    await user.click(screen.getByRole("button", { name: "Add Activity" }));
    await user.click(screen.getByRole("radio", { name: /Insert as Object — move/ }));
    await user.upload(
      screen.getByLabelText("Activity file"),
      new File(["image"], "card.webp", { type: "image/webp" })
    );
    await user.click(screen.getByRole("button", { name: "Insert as Object" }));
    expect(screen.getByRole("button", { name: "Set as Background" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(data.saveWhiteboard).toHaveBeenCalledWith(
      expect.objectContaining({
        objects: [
          expect.objectContaining({
            kind: "image",
            assetId: "activity-asset",
            locked: false,
            background: false,
          }),
        ],
      })
    );
    vi.unstubAllGlobals();
  });

  it("deletes selected objects with the keyboard but not while typing", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Text" }));
    fireEvent.pointerDown(screen.getByRole("img", { name: "Whiteboard canvas" }));
    const editor = screen.getByRole("textbox", { name: "Selected text" });
    fireEvent.keyDown(editor, { key: "Delete" });
    expect(screen.getByLabelText("Text object: Text")).toBeVisible();
    fireEvent.keyDown(window, { key: "Delete" });
    expect(screen.queryByLabelText("Text object: Text")).toBeNull();
  });
});
