import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IconBrowserField, IconRenderer } from "../icons";
import BulkAddPrompts from "./BulkAddPrompts";
import CategoryManager from "./CategoryManager";
import formatPromptDisplayLabel from "./formatPromptDisplayLabel";
import InlineEdit from "./InlineEdit";
import PlaylistManager from "./PlaylistManager";
import PromptAuthoringPanel from "./PromptAuthoringPanel";
import PromptColorPicker from "./PromptColorPicker";
import PromptManageView from "./PromptManageView";
import { promptAccentStyle, readablePromptForeground } from "./promptAppearance";

const deck = {
  id: "deck-1",
  title: "Check In",
  description: "A warm opening",
  category: "Connection",
  categoryId: "category-1",
  color: "#6C46C3",
  iconId: "prompt-default",
  diagnoses: [],
  goals: [],
  ageRanges: [],
  tags: [],
  prompts: [
    {
      id: "prompt-1",
      text: "How are you?",
      color: "#3267A8",
      iconId: "ideas",
      diagnoses: [],
      goals: [],
      ageRanges: [],
      tags: [],
    },
  ],
};

describe("Prompt authoring interactions", () => {
  it("formats taxonomy labels for display without changing the source value", () => {
    const stored = "executive-function";
    expect(formatPromptDisplayLabel(stored)).toBe("Executive Function");
    expect(stored).toBe("executive-function");
    expect(formatPromptDisplayLabel("deep conversations")).toBe("Deep Conversations");
  });

  it("supports preset, full-range, direct hex, and reset color selection", async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);
    const preview = vi.fn();
    render(
      <PromptColorPicker
        label="Deck color"
        onPreview={preview}
        onSave={save}
        value="#A64B6B"
      />
    );

    expect(screen.getByText("Selected Color: #A64B6B")).toBeVisible();
    expect(save).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /use #3267a8/i }));
    expect(save).toHaveBeenLastCalledWith("#3267A8");

    fireEvent.change(screen.getByLabelText(/deck color full color picker/i), {
      target: { value: "#123abc" },
    });
    expect(save).toHaveBeenLastCalledWith("#123ABC");

    const hex = screen.getByRole("textbox", { name: /hex color/i });
    fireEvent.change(hex, { target: { value: "#abcdef" } });
    expect(preview).toHaveBeenLastCalledWith("#ABCDEF");
    await user.click(screen.getByRole("button", { name: /apply color/i }));
    expect(save).toHaveBeenLastCalledWith("#ABCDEF");

    await user.click(screen.getByRole("button", { name: /reset to default/i }));
    expect(save).toHaveBeenLastCalledWith("#6C46C3");
  });

  it("rejects malformed colors without losing the draft", async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    render(<PromptColorPicker label="Deck color" onSave={save} value="#6C46C3" />);
    const hex = screen.getByRole("textbox", { name: /hex color/i });
    await user.clear(hex);
    await user.type(hex, "red");
    await user.click(screen.getByRole("button", { name: /apply color/i }));
    expect(save).not.toHaveBeenCalled();
    expect(hex).toHaveValue("red");
    expect(screen.getByRole("alert")).toHaveTextContent(/six-digit hexadecimal/i);
  });

  it("uses the shared Icon Browser for semantic identity selection", async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);
    render(<IconBrowserField label="Deck Icon" onSave={save} value="ideas" />);

    expect(await screen.findByRole("img", { name: "Ideas" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: /choose icon/i }));
    expect(screen.getByText("Showing 60 of 7735 icons")).toBeVisible();
    const search = screen.getByRole("searchbox", { name: /search icons/i });
    await user.type(search, "watarun01");
    const watArun = screen.getByRole("button", { name: /select watarun01/i });
    expect(watArun).toBeVisible();
    await user.dblClick(watArun);
    expect(save).toHaveBeenLastCalledWith("curated-culture-holidays-watarun01");
    expect(save.mock.calls.flat().some((value) => String(value).includes("/"))).toBe(
      false
    );
  });

  it("renders the curated icon fallback for an unresolved stored ID", () => {
    render(<IconRenderer iconId="unresolved-legacy-icon" />);
    expect(screen.getByLabelText(/default icon/i)).toBeVisible();
  });

  it("derives safe scoped appearance variables for light and dark colors", () => {
    expect(readablePromptForeground("#111111")).toBe("#FFFFFF");
    expect(readablePromptForeground("#F5E9A8")).toBe("#1D2433");
    expect(promptAccentStyle("#123ABC")).toEqual(
      expect.objectContaining({
        "--prompt-identity-color": "#123ABC",
        "--prompt-identity-foreground": "#FFFFFF",
        "--prompt-identity-soft": "#123ABC1F",
      })
    );
    expect(promptAccentStyle("red")).toBeUndefined();
  });

  it("saves single-line inline edits with Enter and cancels with Escape", async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);
    render(<InlineEdit label="deck title" onSave={save} value="Original" />);
    await user.click(screen.getByRole("button", { name: /edit deck title/i }));
    const input = screen.getByRole("textbox", { name: /deck title/i });
    await user.clear(input);
    await user.type(input, "Changed{Enter}");
    expect(save).toHaveBeenCalledWith("Changed");

    await user.click(screen.getByRole("button", { name: /edit deck title/i }));
    await user.clear(screen.getByRole("textbox", { name: /deck title/i }));
    await user.type(
      screen.getByRole("textbox", { name: /deck title/i }),
      "Discard{Escape}"
    );
    expect(screen.getByText("Original")).toBeVisible();
  });

  it("keeps a multiline draft visible after a failed save", async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockRejectedValue(new Error("Could not save"));
    render(<InlineEdit label="prompt text" multiline onSave={save} value="Original" />);
    await user.click(screen.getByRole("button", { name: /edit prompt text/i }));
    const input = screen.getByRole("textbox", { name: /prompt text/i });
    await user.clear(input);
    await user.type(input, "Line one{Enter}Line two");
    expect(save).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    expect(input).toHaveValue("Line one\nLine two");
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
  });

  it("reviews bulk lines, ignores blanks, and preserves repeated text", async () => {
    const user = userEvent.setup();
    const add = vi.fn().mockResolvedValue(undefined);
    render(<BulkAddPrompts onAdd={add} />);
    await user.type(
      screen.getByRole("textbox", { name: /one prompt per line/i }),
      "First\n\nSame\nSame"
    );
    expect(screen.getByText("3 prompts ready to add")).toBeVisible();
    await user.click(screen.getByRole("button", { name: /review complete/i }));
    expect(add).toHaveBeenCalledWith(["First", "Same", "Same"]);
  });

  it("supports category creation, appearance changes, ordering, and archive", async () => {
    const user = userEvent.setup();
    const repository = {
      createCategory: vi.fn().mockResolvedValue(undefined),
      updateCategory: vi.fn().mockResolvedValue(undefined),
      reorderCategories: vi.fn().mockResolvedValue(undefined),
      archiveCategory: vi.fn().mockResolvedValue(undefined),
      restoreCategory: vi.fn().mockResolvedValue(undefined),
    };
    const run = (operation) => operation();
    const categories = [
      {
        id: "one",
        name: "One",
        color: "#6C46C3",
        iconId: "prompt-default",
        archived: false,
      },
      { id: "two", name: "Two", color: "#2D7D73", iconId: "ideas", archived: false },
    ];
    render(<CategoryManager categories={categories} repository={repository} run={run} />);
    const firstCategoryColor = screen.getByRole("group", {
      name: /one category color/i,
    });
    await user.click(
      within(firstCategoryColor).getByRole("button", { name: /use #3267a8/i })
    );
    expect(repository.updateCategory).toHaveBeenCalledWith("one", { color: "#3267A8" });
    const firstCategoryIcon = screen.getByRole("group", {
      name: /one category icon/i,
    });
    await user.click(within(firstCategoryIcon).getByRole("button"));
    await user.type(screen.getByRole("searchbox", { name: /search icons/i }), "rainbow");
    await user.dblClick(screen.getByRole("button", { name: /^select nature$/i }));
    expect(repository.updateCategory).toHaveBeenCalledWith("one", {
      iconId: "nature",
    });
    await user.click(screen.getAllByRole("button", { name: /move down/i })[0]);
    expect(repository.reorderCategories).toHaveBeenCalledWith(["two", "one"]);
    await user.click(screen.getAllByRole("button", { name: /^archive$/i })[0]);
    expect(repository.archiveCategory).toHaveBeenCalledWith("one");
  });

  it("creates decks and exposes archived-content controls after explicit seeding", async () => {
    const user = userEvent.setup();
    const createPromptDeck = vi.fn().mockResolvedValue(undefined);
    const authoring = {
      seeded: true,
      categories: [],
      decks: [],
      playlists: [],
      seed: vi.fn(),
      run: (operation) => operation(),
      repositories: {
        decks: { createPromptDeck },
        categories: {},
        playlists: {},
      },
    };
    render(
      <PromptAuthoringPanel
        authoring={authoring}
        setShowArchived={vi.fn()}
        showArchived={false}
      />
    );
    await user.click(screen.getByRole("button", { name: /new deck/i }));
    await user.type(screen.getByRole("textbox", { name: /deck title/i }), "New Deck");
    await user.click(screen.getByRole("button", { name: /save deck/i }));
    expect(createPromptDeck).toHaveBeenCalledWith({ title: "New Deck" });
    await user.click(screen.getByText(/manage prompt library/i));
    expect(
      screen.getByRole("checkbox", { name: /show archived content/i })
    ).toBeVisible();
  });

  it("wires deck appearance, metadata, prompt creation, duplication, and ordering", async () => {
    const user = userEvent.setup();
    const decksRepository = Object.fromEntries(
      [
        "updatePromptDeck",
        "addPrompt",
        "bulkAddPrompts",
        "updatePrompt",
        "duplicatePrompt",
        "deletePrompt",
        "reorderPrompts",
        "movePrompt",
        "copyPrompt",
      ].map((name) => [name, vi.fn().mockResolvedValue(undefined)])
    );
    const repositories = {
      decks: decksRepository,
      playlists: { addPlaylistItem: vi.fn() },
    };
    render(
      <PromptManageView
        categories={[{ id: "category-1", name: "Connection", archived: false }]}
        deck={deck}
        decks={[deck]}
        playlists={[]}
        repositories={repositories}
        run={(operation) => operation()}
      />
    );
    expect(screen.queryByLabelText(/live deck appearance preview/i)).toBeNull();
    await user.click(
      within(screen.getByRole("group", { name: /deck color/i })).getByRole("button", {
        name: /use #3267a8/i,
      })
    );
    expect(decksRepository.updatePromptDeck).toHaveBeenCalledWith("deck-1", {
      color: "#3267A8",
    });
    const deckIconField = screen.getByRole("group", { name: /deck icon/i });
    await user.click(within(deckIconField).getByRole("button"));
    await user.type(screen.getByRole("searchbox", { name: /search icons/i }), "study01");
    await user.dblClick(screen.getByRole("button", { name: /^select study01$/i }));
    expect(decksRepository.updatePromptDeck).toHaveBeenCalledWith("deck-1", {
      iconId: "curated-school-work-study01",
    });
    await user.type(
      screen.getByRole("textbox", { name: /^new prompt$/i }),
      "A new question"
    );
    await user.click(screen.getByRole("button", { name: /^add prompt$/i }));
    expect(decksRepository.addPrompt).toHaveBeenCalledWith("deck-1", {
      text: "A new question",
    });
    expect(screen.queryByRole("button", { name: /^duplicate$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^delete$/i })).toBeNull();
    const options = screen.getByRole("button", {
      name: /show options for how are you/i,
    });
    expect(options).toHaveAttribute("aria-expanded", "false");
    await user.click(options);
    expect(options).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Using a card override")).toBeVisible();
    await user.click(screen.getByRole("button", { name: /use deck visual/i }));
    expect(decksRepository.updatePrompt).toHaveBeenCalledWith("deck-1", "prompt-1", {
      iconId: null,
    });
    await user.click(screen.getByRole("button", { name: /^duplicate$/i }));
    expect(decksRepository.duplicatePrompt).toHaveBeenCalledWith("deck-1", "prompt-1");
  });

  it("keeps prompt cards readable and collapsed while preserving expanded drafts", async () => {
    const user = userEvent.setup();
    const secondPrompt = {
      ...deck.prompts[0],
      id: "prompt-2",
      text: "What helped today?",
      color: "#A64B6B",
      iconId: "calm",
    };
    const deckWithTwoPrompts = { ...deck, prompts: [...deck.prompts, secondPrompt] };
    const repositories = {
      decks: Object.fromEntries(
        [
          "updatePromptDeck",
          "addPrompt",
          "bulkAddPrompts",
          "updatePrompt",
          "duplicatePrompt",
          "deletePrompt",
          "reorderPrompts",
          "movePrompt",
          "copyPrompt",
        ].map((name) => [name, vi.fn().mockResolvedValue(undefined)])
      ),
      playlists: { addPlaylistItem: vi.fn() },
    };
    render(
      <PromptManageView
        categories={[]}
        deck={deckWithTwoPrompts}
        decks={[deckWithTwoPrompts]}
        playlists={[]}
        repositories={repositories}
        run={(operation) => operation()}
      />
    );

    const firstCard = screen.getByText("How are you?").closest("li");
    expect(firstCard).not.toBeNull();
    expect(await within(firstCard).findByRole("img", { name: "Ideas" })).toBeVisible();
    expect(within(firstCard).getByLabelText("Prompt color #3267A8")).toBeVisible();
    expect(screen.queryByRole("textbox", { name: "Diagnoses" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^delete$/i })).toBeNull();
    expect(screen.getAllByRole("button", { name: /show options for/i })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /edit prompt text/i })).toHaveLength(2);

    const firstToggle = screen.getByRole("button", {
      name: /show options for how are you/i,
    });
    await user.click(firstToggle);
    expect(firstToggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("textbox", { name: "Diagnoses" })).toBeVisible();
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeVisible();
    expect(
      screen.getByRole("button", { name: /show options for what helped today/i })
    ).toHaveAttribute("aria-expanded", "false");

    const diagnoses = screen.getByRole("textbox", { name: "Diagnoses" });
    await user.type(diagnoses, "Anxiety");
    await user.click(
      screen.getByRole("button", { name: /hide options for how are you/i })
    );
    expect(screen.queryByRole("textbox", { name: "Diagnoses" })).toBeNull();
    await user.click(
      screen.getByRole("button", { name: /show options for how are you/i })
    );
    expect(screen.getByRole("textbox", { name: "Diagnoses" })).toHaveValue("Anxiety");
  });

  it("collapses deck clinical metadata without losing its draft", async () => {
    const user = userEvent.setup();
    const repositories = {
      decks: {
        updatePromptDeck: vi.fn(),
        addPrompt: vi.fn(),
        bulkAddPrompts: vi.fn(),
        updatePrompt: vi.fn(),
        duplicatePrompt: vi.fn(),
        deletePrompt: vi.fn(),
        reorderPrompts: vi.fn(),
        movePrompt: vi.fn(),
        copyPrompt: vi.fn(),
      },
      playlists: { addPlaylistItem: vi.fn() },
    };
    render(
      <PromptManageView
        categories={[]}
        deck={{ ...deck, prompts: [] }}
        decks={[deck]}
        playlists={[]}
        repositories={repositories}
        run={(operation) => operation()}
      />
    );

    expect(screen.queryByRole("textbox", { name: "Goals" })).toBeNull();
    expect(screen.getByRole("button", { name: /edit deck title/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /edit deck description/i })).toBeVisible();
    expect(screen.getByRole("combobox", { name: /^category$/i })).toBeVisible();
    expect(screen.getByRole("group", { name: /deck color/i })).toBeVisible();
    expect(screen.getByRole("group", { name: /deck icon/i })).toBeVisible();
    expect(screen.queryByLabelText("Live deck appearance preview")).toBeNull();

    await user.click(screen.getByRole("button", { name: /show clinical metadata/i }));
    const goals = screen.getByRole("textbox", { name: "Goals" });
    await user.type(goals, "Connection");
    await user.click(screen.getByRole("button", { name: /hide clinical metadata/i }));
    expect(screen.queryByRole("textbox", { name: "Goals" })).toBeNull();
    await user.click(screen.getByRole("button", { name: /show clinical metadata/i }));
    expect(screen.getByRole("textbox", { name: "Goals" })).toHaveValue("Connection");
  });

  it("creates a category inline from the deck selector and supports cancel", async () => {
    const user = userEvent.setup();
    const createCategory = vi
      .fn()
      .mockResolvedValue({ id: "new-category", name: "Games" });
    const updatePromptDeck = vi.fn().mockResolvedValue(undefined);
    const repositories = {
      decks: {
        updatePromptDeck,
        addPrompt: vi.fn(),
        bulkAddPrompts: vi.fn(),
        updatePrompt: vi.fn(),
        duplicatePrompt: vi.fn(),
        deletePrompt: vi.fn(),
        reorderPrompts: vi.fn(),
        movePrompt: vi.fn(),
        copyPrompt: vi.fn(),
      },
      categories: { createCategory },
      playlists: { addPlaylistItem: vi.fn() },
    };
    render(
      <PromptManageView
        categories={[]}
        deck={{ ...deck, prompts: [] }}
        decks={[deck]}
        playlists={[]}
        repositories={repositories}
        run={(operation) => operation()}
      />
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: /^category$/i }),
      "__new__"
    );
    expect(screen.getByRole("heading", { name: /new category/i })).toBeVisible();
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(createCategory).not.toHaveBeenCalled();
    await user.selectOptions(
      screen.getByRole("combobox", { name: /^category$/i }),
      "__new__"
    );
    await user.type(screen.getByRole("textbox", { name: /category name/i }), "Games");
    await user.click(screen.getByRole("button", { name: /save category/i }));
    expect(createCategory).toHaveBeenCalledWith({
      name: "Games",
      color: "#6C46C3",
      iconId: "prompt-default",
    });
    expect(updatePromptDeck).toHaveBeenCalledWith("deck-1", {
      categoryId: "new-category",
      category: "Games",
    });
  });

  it("creates a playlist inline and adds the current prompt", async () => {
    const user = userEvent.setup();
    const createPlaylist = vi.fn().mockResolvedValue({ id: "new-list" });
    const addPlaylistItem = vi.fn().mockResolvedValue(undefined);
    const repositories = {
      decks: {
        updatePromptDeck: vi.fn(),
        addPrompt: vi.fn(),
        bulkAddPrompts: vi.fn(),
        updatePrompt: vi.fn(),
        duplicatePrompt: vi.fn(),
        deletePrompt: vi.fn(),
        reorderPrompts: vi.fn(),
        movePrompt: vi.fn(),
        copyPrompt: vi.fn(),
      },
      playlists: { createPlaylist, addPlaylistItem },
    };
    render(
      <PromptManageView
        categories={[]}
        deck={deck}
        decks={[deck]}
        playlists={[]}
        repositories={repositories}
        run={(operation) => operation()}
      />
    );
    await user.click(
      screen.getByRole("button", { name: /show options for how are you/i })
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: /add to playlist/i }),
      "__new__"
    );
    await user.type(
      screen.getByRole("textbox", { name: /playlist title/i }),
      "Session picks"
    );
    await user.type(screen.getByRole("textbox", { name: /description/i }), "Today");
    await user.click(screen.getByRole("button", { name: /save playlist/i }));
    expect(createPlaylist).toHaveBeenCalledWith({
      title: "Session picks",
      description: "Today",
    });
    expect(addPlaylistItem).toHaveBeenCalledWith("new-list", {
      type: "prompt-item",
      deckId: "deck-1",
      promptId: "prompt-1",
    });
  });

  it("creates playlists and persists keyboard-accessible item ordering", async () => {
    const user = userEvent.setup();
    const repository = {
      createPlaylist: vi.fn().mockResolvedValue(undefined),
      updatePlaylist: vi.fn(),
      addPlaylistItem: vi.fn(),
      removePlaylistItem: vi.fn(),
      reorderPlaylistItems: vi.fn().mockResolvedValue(undefined),
      duplicatePlaylist: vi.fn(),
      archivePlaylist: vi.fn(),
      restorePlaylist: vi.fn(),
    };
    const playlist = {
      id: "list",
      title: "List",
      description: "",
      archived: false,
      items: [
        { id: "item-1", type: "prompt-deck", deckId: "deck-1" },
        { id: "item-2", type: "prompt-item", deckId: "deck-1", promptId: "prompt-1" },
      ],
    };
    render(
      <PlaylistManager
        decks={[deck]}
        playlists={[playlist]}
        repository={repository}
        run={(operation) => operation()}
      />
    );
    await user.click(screen.getAllByRole("button", { name: /move down/i })[0]);
    expect(repository.reorderPlaylistItems).toHaveBeenCalledWith("list", [
      "item-2",
      "item-1",
    ]);
  });
});
