import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import WorksheetDocumentRenderer from "./WorksheetDocumentRenderer";

function documentWith(blocks) {
  return {
    pages: [
      {
        id: "page-1",
        title: "Page 1",
        settings: { paperSize: "letter", orientation: "portrait", margin: "normal" },
        blocks: blocks.map((block, sortOrder) => ({ ...block, sortOrder })),
      },
    ],
  };
}

const heading = {
  id: "heading-1",
  type: "heading",
  text: "Notice This",
  level: 1,
  alignment: "center",
};
const paragraph = {
  id: "paragraph-1",
  type: "paragraph",
  text: "A second block",
  alignment: "right",
};

describe("WorksheetDocumentRenderer editing", () => {
  it("selects a block with pointer or keyboard and shows actions only for it", async () => {
    const user = userEvent.setup();
    const onSelectBlock = vi.fn();
    const onMoveBlock = vi.fn();
    const onDuplicateBlock = vi.fn();
    const onDeleteBlock = vi.fn();
    const document = documentWith([heading, paragraph]);
    const { rerender } = render(
      <WorksheetDocumentRenderer document={document} onSelectBlock={onSelectBlock} />
    );

    const headingBlock = screen.getByRole("button", { name: "Edit heading block" });
    await user.click(headingBlock);
    headingBlock.focus();
    await user.keyboard("{Enter}");
    expect(onSelectBlock).toHaveBeenCalledWith("heading-1");
    expect(screen.queryByLabelText("Block Actions")).toBeNull();

    rerender(
      <WorksheetDocumentRenderer
        document={document}
        onDeleteBlock={onDeleteBlock}
        onDuplicateBlock={onDuplicateBlock}
        onMoveBlock={onMoveBlock}
        onSelectBlock={onSelectBlock}
        selectedBlockId="heading-1"
      />
    );
    expect(screen.getAllByLabelText("Block Actions")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Move heading block up" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Move heading block down" }));
    await user.click(screen.getByRole("button", { name: "Duplicate" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onMoveBlock).toHaveBeenCalledWith("heading-1", 1);
    expect(onDuplicateBlock).toHaveBeenCalledWith("heading-1");
    expect(onDeleteBlock).toHaveBeenCalledWith("heading-1");
  });

  it("renders the exposed settings in preview content", () => {
    render(
      <WorksheetDocumentRenderer
        document={documentWith([
          heading,
          paragraph,
          {
            id: "response",
            type: "long-response",
            prompt: "Write here",
            placeholder: "",
            lineCount: 8,
          },
          { id: "drawing", type: "drawing-area", prompt: "Draw", height: "large" },
          {
            id: "checklist",
            type: "checklist",
            prompt: "Choose",
            items: ["One"],
            allowOther: true,
          },
          {
            id: "choices",
            type: "multiple-choice",
            prompt: "Pick",
            options: ["One", "Two"],
            selectionMode: "multiple",
          },
          {
            id: "rating",
            type: "rating-scale",
            prompt: "Rate",
            minimum: 0,
            maximum: 2,
            minimumLabel: "Low",
            maximumLabel: "High",
            showNumbers: false,
          },
          { id: "divider", type: "divider", style: "dotted" },
          { id: "spacer", type: "spacer", size: "large" },
        ])}
      />
    );

    expect(screen.getByRole("heading", { name: "Notice This", level: 1 })).toHaveStyle(
      "text-align: center"
    );
    expect(screen.getByText("A second block")).toHaveStyle("text-align: right");
    expect(document.querySelector(".worksheet-response-lines--8")).toBeTruthy();
    expect(document.querySelector(".worksheet-drawing-area--large")).toBeTruthy();
    expect(screen.getByText(/Other:/)).toBeInTheDocument();
    expect(screen.getAllByText("☐ One")).toHaveLength(2);
    expect(screen.getAllByText("○")).toHaveLength(3);
    expect(document.querySelector(".worksheet-divider--dotted")).toBeTruthy();
    expect(document.querySelector(".worksheet-spacer--large")).toBeTruthy();
  });

  it("renders every structured clinical block as printable document content", () => {
    render(
      <WorksheetDocumentRenderer
        document={documentWith([
          {
            id: "reflection",
            type: "reflection",
            title: "What did you notice?",
            instruction: "Take your time.",
            lineCount: 4,
          },
          {
            id: "table",
            type: "basic-table",
            headers: ["Before", "After"],
            rows: [["Tense", "Calmer"]],
          },
          {
            id: "sentence",
            type: "sentence-completion",
            textBefore: "I feel",
            textAfter: "when this happens.",
            blankSize: "long",
          },
          {
            id: "thought-check",
            type: "cbt-thought-check",
            labels: {
              situation: "Situation",
              thought: "Thought",
              feeling: "Feeling",
              evidenceFor: "Evidence For",
              evidenceAgainst: "Evidence Against",
              balancedThought: "More Balanced Thought",
            },
            lineCount: 2,
          },
          {
            id: "coping-plan",
            type: "coping-plan",
            triggerPrompt: "When this happens",
            choicesPrompt: "Coping choices",
            choices: ["Breathe", "Ask for help"],
            tryPrompt: "What I will try",
            helpedPrompt: "What helped",
            lineCount: 2,
          },
        ])}
      />
    );

    expect(screen.getByRole("heading", { name: "What did you notice?" })).toBeVisible();
    expect(screen.getByRole("table")).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Before" })).toBeVisible();
    expect(screen.getByText("I feel")).toBeVisible();
    expect(document.querySelector(".worksheet-inline-blank--long")).toBeTruthy();
    expect(screen.getByRole("region", { name: "CBT Thought Check" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Coping Plan" })).toBeVisible();
    expect(screen.getByText("☐ Breathe")).toBeVisible();
  });
});
