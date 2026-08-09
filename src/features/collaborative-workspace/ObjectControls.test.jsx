import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ObjectControls from "./ObjectControls";

const object = { id: "dog", label: "Dog" };

describe("ObjectControls", () => {
  it("uses understandable arrangement labels and keeps disabled directions clear", () => {
    render(
      <ObjectControls
        canMoveBackward={false}
        canMoveForward
        object={object}
        onAction={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Bring Forward" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Send Back" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Make a Copy" })).toBeEnabled();
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

    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(onAction).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Tap Again to Remove" }));
    expect(onAction).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledWith("delete");
  });
});
