import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { interventionGuidanceSchema, resourceSchema } from "../../models";
import InterventionImportPanel from "./InterventionImportPanel";

const resource = resourceSchema.parse({
  id: "imported-calm",
  type: "intervention",
  title: "Imported Calm",
  description: "A calm activity.",
  diagnoses: [],
  goals: [],
  ageRanges: [],
  tags: [],
  materials: [],
  settings: [],
  telehealthFriendly: true,
  durationMinutes: null,
  source: "Reviewed source",
  research: [],
  useWith: [],
  worksWellWhen: [],
  kidsWhoLike: [],
  relatedResourceIds: [],
  usageCount: 0,
  rating: null,
  favorite: false,
  lastUsedAt: null,
  createdAt: "2026-08-11T12:00:00.000Z",
  updatedAt: "2026-08-11T12:00:00.000Z",
});
const guidance = interventionGuidanceSchema.parse({
  resourceId: resource.id,
  overview: "Overview",
  whenToUse: [],
  introduction: "Let us begin.",
  steps: ["Begin."],
  therapistPrompts: [],
  processingQuestions: [],
  adaptations: [],
  cautions: [],
  sourceStatus: "Reviewed source",
});

describe("InterventionImportPanel", () => {
  it("offers JSON and ordinary-document conversion paths", () => {
    render(<InterventionImportPanel repository={{}} />);
    expect(screen.getByRole("button", { name: "Choose JSON" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Paste Text" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Choose TXT" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Choose DOCX" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Choose PDF" })).toBeVisible();
  });

  it("validates, previews, and confirms a complete file", async () => {
    const user = userEvent.setup();
    const repository = { importInterventions: vi.fn(async () => []) };
    const onImported = vi.fn();
    render(<InterventionImportPanel repository={repository} onImported={onImported} />);
    const file = new File(
      [
        JSON.stringify({
          format: "therapy-studio-interventions",
          version: 1,
          interventions: [{ resource, guidance }],
        }),
      ],
      "interventions.json",
      { type: "application/json" }
    );
    await user.upload(screen.getByLabelText("Choose Intervention import file"), file);
    expect(screen.getByText("Imported Calm")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Confirm Import" }));
    expect(repository.importInterventions).toHaveBeenCalledWith([{ resource, guidance }]);
    expect(onImported).toHaveBeenCalled();
  });

  it("shows invalid input without writing", async () => {
    const user = userEvent.setup();
    const repository = { importInterventions: vi.fn() };
    render(<InterventionImportPanel repository={repository} />);
    await user.upload(
      screen.getByLabelText("Choose Intervention import file"),
      new File(["{"], "bad.json", { type: "application/json" })
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("could not read");
    expect(repository.importInterventions).not.toHaveBeenCalled();
  });
});
