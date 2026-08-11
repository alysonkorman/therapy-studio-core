import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PromptVisual from "./PromptVisual";
import resolvePromptVisualId from "./resolvePromptVisualId";

describe("PromptVisual", () => {
  it("uses a card override before the deck visual", async () => {
    render(
      <PromptVisual
        deck={{ iconId: "ideas" }}
        prompt={{ iconId: "curated-school-work-study01" }}
      />
    );
    expect(await screen.findByRole("img", { name: "Study01" })).toBeVisible();
    expect(
      resolvePromptVisualId(
        { iconId: "curated-school-work-study01" },
        { iconId: "ideas" }
      )
    ).toBe("curated-school-work-study01");
  });

  it("dynamically follows deck changes only when no override exists", async () => {
    const { rerender } = render(
      <PromptVisual deck={{ iconId: "ideas" }} prompt={{ id: "one" }} />
    );
    expect(await screen.findByRole("img", { name: "Ideas" })).toBeVisible();

    rerender(<PromptVisual deck={{ iconId: "calm" }} prompt={{ id: "one" }} />);
    expect(await screen.findByRole("img", { name: "Calm" })).toBeVisible();

    rerender(
      <PromptVisual
        deck={{ iconId: "ideas" }}
        prompt={{ id: "one", iconId: "curated-school-work-study01" }}
      />
    );
    expect(await screen.findByRole("img", { name: "Study01" })).toBeVisible();
    rerender(
      <PromptVisual
        deck={{ iconId: "calm" }}
        prompt={{ id: "one", iconId: "curated-school-work-study01" }}
      />
    );
    expect(await screen.findByRole("img", { name: "Study01" })).toBeVisible();
  });

  it("uses the shared safe fallback for an unknown card icon", () => {
    render(
      <PromptVisual deck={{ iconId: "ideas" }} prompt={{ iconId: "missing-card-icon" }} />
    );
    expect(screen.getByLabelText(/default icon/i)).toBeVisible();
  });
});
