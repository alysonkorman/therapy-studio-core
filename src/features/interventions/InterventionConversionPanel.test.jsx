import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import InterventionConversionPanel from "./InterventionConversionPanel";

const source = `
Title: Grounding Pause
Overview: A short grounding practice.
Introduction: Let's pause together.
Steps:
1. Notice your feet.
2. Take one slow breath.
Source: Therapist-created material
`;

describe("InterventionConversionPanel", () => {
  it("requires review and imports the edited canonical pair", async () => {
    const user = userEvent.setup();
    const repository = { importInterventions: vi.fn(async () => []) };
    const onImported = vi.fn();
    render(
      <InterventionConversionPanel
        mode="paste"
        onImported={onImported}
        repository={repository}
      />
    );

    await user.type(screen.getByLabelText("Intervention text"), source);
    await user.click(screen.getByRole("button", { name: "Review Conversion" }));
    expect(screen.getByRole("heading", { name: "Review Conversion" })).toBeVisible();
    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Edited Grounding Pause");
    await user.click(screen.getByRole("button", { name: "Confirm Import" }));

    expect(repository.importInterventions).toHaveBeenCalledTimes(1);
    const [[pairs]] = repository.importInterventions.mock.calls;
    expect(pairs[0].resource.title).toBe("Edited Grounding Pause");
    expect(pairs[0].guidance.steps).toEqual([
      "Notice your feet.",
      "Take one slow breath.",
    ]);
    expect(onImported).toHaveBeenCalled();
  });

  it("does not write when review is cancelled", async () => {
    const user = userEvent.setup();
    const repository = { importInterventions: vi.fn() };
    const onBack = vi.fn();
    render(
      <InterventionConversionPanel mode="paste" onBack={onBack} repository={repository} />
    );
    await user.type(screen.getByLabelText("Intervention text"), source);
    await user.click(screen.getByRole("button", { name: "Review Conversion" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onBack).toHaveBeenCalled();
    expect(repository.importInterventions).not.toHaveBeenCalled();
  });
});
