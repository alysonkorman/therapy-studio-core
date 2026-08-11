import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import IconBrowserField from "./IconBrowserField";
import IconRenderer from "./IconRenderer";

describe("Icon Browser", () => {
  it("searches, filters, paginates, and confirms semantic IDs", async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    render(<IconBrowserField label="Deck Icon" onSave={save} value="ideas" />);

    await user.click(screen.getByRole("button", { name: /choose icon/i }));
    expect(screen.getByRole("dialog", { name: /choose deck icon/i })).toBeVisible();
    expect(screen.getByText("Showing 60 of 7622 icons")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /load more icons/i }));
    expect(screen.getByText("Showing 120 of 7622 icons")).toBeVisible();

    await user.type(
      screen.getByRole("searchbox", { name: /search icons/i }),
      "watarun01"
    );
    const watArun = screen.getByRole("button", { name: /select watarun01/i });
    expect(watArun).toBeVisible();
    await user.dblClick(watArun);
    expect(save).toHaveBeenLastCalledWith("curated-culture-holidays-watarun01");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(save.mock.calls.flat().some((value) => String(value).includes("/"))).toBe(
      false
    );
  });

  it("supports folder browsing, keyboard confirmation, and Escape", async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    render(<IconBrowserField label="Category Icon" onSave={save} value="calm" />);
    await user.click(screen.getByRole("button", { name: /choose icon/i }));
    await user.click(screen.getByRole("button", { name: /^culture & holidays72$/i }));
    expect(screen.getByText("Showing 60 of 72 icons")).toBeVisible();

    const icon = screen.getAllByRole("button", { name: /select /i })[0];
    icon.focus();
    await user.keyboard("{Enter}");
    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();

    const trigger = screen.getByRole("button", { name: /choose icon/i });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("preserves search and folder state while paging and shows an empty state", async () => {
    const user = userEvent.setup();
    render(<IconBrowserField label="Deck Icon" onSave={vi.fn()} value="ideas" />);
    await user.click(screen.getByRole("button", { name: /choose icon/i }));
    await user.click(
      screen.getByRole("button", {
        name: /activities \/ arts, crafts & music/i,
      })
    );
    await user.click(screen.getByRole("button", { name: /load more icons/i }));
    expect(screen.getByText("Showing 89 of 89 icons")).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: /activities \/ arts, crafts & music/i,
      })
    ).toHaveAttribute("aria-current", "true");

    const search = screen.getByRole("searchbox", { name: /search icons/i });
    await user.type(search, "no icon has this exact label");
    expect(search).toHaveValue("no icon has this exact label");
    expect(screen.getByText("Showing 0 of 0 icons")).toBeVisible();
    expect(screen.getByText("No icons match that search.")).toBeVisible();
  });

  it("clears the selected identity icon without persisting a path", async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    render(<IconBrowserField label="Category Icon" onSave={save} value="nature" />);
    await user.click(screen.getByRole("button", { name: /choose icon/i }));
    await user.click(screen.getByRole("button", { name: /clear icon/i }));
    expect(save).toHaveBeenCalledWith("prompt-default");
    expect(save.mock.calls.flat().some((value) => String(value).includes("/"))).toBe(
      false
    );
  });

  it("renders a selected SVG and the fallback", async () => {
    render(
      <>
        <IconRenderer iconId="curated-school-work-study01" />
        <IconRenderer iconId="unresolved-icon" />
      </>
    );
    expect(screen.getByRole("status", { name: "Loading Study01" })).toBeVisible();
    expect(await screen.findByRole("img", { name: "Study01" })).toBeVisible();
    expect(await screen.findByLabelText("Default Icon")).toBeVisible();
  });

  it("renders a persisted semantic selection after remounting", async () => {
    const user = userEvent.setup();
    let persistedIconId = "ideas";
    const save = vi.fn((iconId) => {
      persistedIconId = iconId;
    });
    const view = render(
      <IconBrowserField label="Deck Icon" onSave={save} value={persistedIconId} />
    );

    await user.click(screen.getByRole("button", { name: /choose icon/i }));
    await user.type(
      screen.getByRole("searchbox", { name: /search icons/i }),
      "watarun01"
    );
    await user.dblClick(screen.getByRole("button", { name: /select watarun01/i }));
    view.unmount();

    render(
      <IconBrowserField label="Deck Icon" onSave={vi.fn()} value={persistedIconId} />
    );
    expect(await screen.findByRole("img", { name: "Watarun01" })).toBeVisible();
  });
});
