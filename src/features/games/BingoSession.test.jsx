import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { pictureWordBingo } from "../../data/resources";
import BingoSession from "./BingoSession";

function game(input = {}) {
  return { ...pictureWordBingo, boardSize: 3, useFreeSpace: false, ...input };
}

describe("BingoSession", () => {
  it("marks, unmarks, and reports meaningful use at first mark", async () => {
    const user = userEvent.setup();
    const onMeaningfulUse = vi.fn();
    render(
      <BingoSession game={game()} onMeaningfulUse={onMeaningfulUse} random={() => 0.5} />
    );
    const square = screen.getAllByRole("button", { name: /^Mark / })[0];
    await user.click(square);
    expect(square).toHaveAttribute("aria-pressed", "true");
    expect(onMeaningfulUse).toHaveBeenCalledOnce();
    await user.click(square);
    expect(square).toHaveAttribute("aria-pressed", "false");
  });

  it("clears marked squares and generates a new board", async () => {
    const user = userEvent.setup();
    let value = 0.1;
    render(<BingoSession game={game()} random={() => value} />);
    const firstBefore = screen.getAllByRole("button", { name: /^Mark / })[0].textContent;
    await user.click(screen.getAllByRole("button", { name: /^Mark / })[0]);
    await user.click(screen.getByRole("button", { name: "Clear Board" }));
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
    value = 0.9;
    await user.click(screen.getByRole("button", { name: "New Board" }));
    expect(screen.getAllByRole("button", { name: /^Mark / })[0].textContent).not.toBe(
      firstBefore
    );
  });

  it("announces BINGO for a completed line", async () => {
    const user = userEvent.setup();
    render(<BingoSession game={game()} random={() => 0.5} />);
    const squares = screen.getAllByRole("button", { name: /^Mark / });
    await user.click(squares[0]);
    await user.click(squares[1]);
    await user.click(squares[2]);
    expect(screen.getByRole("status")).toHaveTextContent("BINGO!");
  });

  it("renders optional square icons and a marked Free Space", () => {
    const iconGame = game({
      useFreeSpace: true,
      items: pictureWordBingo.items.map((item, index) =>
        index === 0 ? { ...item, iconId: "missing-test-icon" } : item
      ),
    });
    render(<BingoSession game={iconGame} random={() => 0.999} />);
    expect(screen.getByRole("button", { name: "Free Space" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(document.querySelector(".bingo-square img, .bingo-square svg")).not.toBeNull();
  });

  it("shows a useful error when the item pool is too small", () => {
    render(<BingoSession game={game({ items: pictureWordBingo.items.slice(0, 2) })} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "3×3 Bingo needs at least 9 unique items"
    );
    expect(screen.queryByRole("button", { name: /^Mark / })).toBeNull();
  });
});
