import { describe, expect, it } from "vitest";

import {
  convertWorksheetText,
  createWorksheetPairFromConversion,
} from "./convertWorksheetDocument";

describe("convertWorksheetText", () => {
  it("maps structured text into conservative editable Worksheet blocks", () => {
    const result = convertWorksheetText(`
Title: Worry Check-In
Instructions:
Think about today before answering.
HOW I FEEL
How strong is the worry? 0-10
I notice ______ when worry shows up.
What would help right now?
____
____
Choices:
[ ] Take a breath
[ ] Ask for help
Reflection:
What did you notice?
Source: Synthetic therapist-created example — private use only
`);

    expect(result.title).toBe("Worry Check-In");
    expect(result.attribution).toContain("Synthetic therapist-created example");
    expect(result.warnings).toContain("private use only");
    expect(result.pages[0].blocks.map(({ type }) => type)).toEqual([
      "instruction",
      "heading",
      "rating-scale",
      "sentence-completion",
      "long-response",
      "checklist",
      "reflection",
    ]);
  });

  it("recognizes explicit multiple choice while preserving ordinary prose", () => {
    const result = convertWorksheetText(`
My Worksheet
This paragraph explains the activity.
Which choice fits best?
A. First choice
B. Second choice
C. Third choice
`);
    expect(result.pages[0].blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "paragraph" }),
        expect.objectContaining({
          type: "multiple-choice",
          options: ["First choice", "Second choice", "Third choice"],
        }),
      ])
    );
  });

  it("uses specialized blocks only for explicit complete structures", () => {
    const cbt = convertWorksheetText(
      "Thought Check\nSituation\nThought\nFeeling\nEvidence For\nEvidence Against\nBalanced Thought"
    );
    expect(cbt.pages[0].blocks).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "cbt-thought-check" })])
    );

    const coping = convertWorksheetText(
      "Coping Plan\nTrigger\nCoping Choices\nWhat I Will Try\nWhat Helped"
    );
    expect(coping.pages[0].blocks).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "coping-plan" })])
    );

    const ambiguous = convertWorksheetText("Thoughts and feelings can be useful clues.");
    expect(ambiguous.pages[0].blocks[0].type).toBe("paragraph");
  });

  it("preserves pages and valid simple DOCX tables", () => {
    const result = convertWorksheetText("Page One\fPage Two", {
      tables: [
        {
          pageIndex: 1,
          rows: [
            ["Situation", "Response"],
            ["At school", "Ask for help"],
          ],
        },
      ],
    });
    expect(result.pages).toHaveLength(2);
    expect(result.pages[1].blocks.at(-1)).toMatchObject({
      type: "basic-table",
      headers: ["Situation", "Response"],
    });
  });
});

describe("createWorksheetPairFromConversion", () => {
  it("creates a current validated Worksheet Resource/document pair", () => {
    const review = convertWorksheetText("Title: Check-In\nHow are you today?");
    const ids = ["page-1", "block-1"];
    const pair = createWorksheetPairFromConversion(review, {
      id: "worksheet-check-in",
      createId: () => ids.shift(),
      now: "2026-08-11T12:00:00.000Z",
    });
    expect(pair.resource).toMatchObject({
      id: "worksheet-check-in",
      type: "worksheet",
      title: "Check-In",
    });
    expect(pair.document.worksheetId).toBe(pair.resource.id);
  });

  it("rejects an invalid reviewed Worksheet", () => {
    expect(() =>
      createWorksheetPairFromConversion(
        { title: "", pages: [{ title: "Page 1", blocks: [] }] },
        { id: "bad", createId: () => "page", now: "2026-08-11T12:00:00.000Z" }
      )
    ).toThrow();
  });
});
