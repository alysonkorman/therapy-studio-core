import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ObjectControls from "./ObjectControls";

const object = { id: "dog", label: "Dog" };

describe("ObjectControls", () => {
  it("keeps secondary actions inside a compact contextual menu", async () => {
    const user = userEvent.setup();
    render(
      <ObjectControls
        canMoveBackward={false}
        canMoveForward
        object={object}
        onAction={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Make a Copy" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "More actions for Dog" }));

    expect(screen.getByRole("menuitem", { name: "Bring Forward" })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: "Send Back" })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: "Make a Copy" })).toBeEnabled();
  });

  it("requires a deliberate second action before removing an object", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <ObjectControls
        canMoveBackward
        canMoveForward
        object={object}
        onAction={onAction}
      />
    );

    await user.click(screen.getByRole("button", { name: "More actions for Dog" }));
    await user.click(screen.getByRole("menuitem", { name: "Remove" }));
    expect(onAction).not.toHaveBeenCalled();

    await user.click(screen.getByRole("menuitem", { name: "Tap Again to Remove" }));
    expect(onAction).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledWith("delete");
  });
});
