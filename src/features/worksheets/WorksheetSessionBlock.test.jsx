import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import WorksheetSessionBlock from "./WorksheetSessionBlock";

const base = { id: "block", sortOrder: 0 };

describe("WorksheetSessionBlock", () => {
  it("captures short, long, reflection, and sentence-completion responses", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <WorksheetSessionBlock
        block={{
          ...base,
          type: "short-response",
          prompt: "One word?",
          placeholder: "",
          lineCount: 1,
        }}
        onChange={onChange}
        response={{}}
      />
    );
    await user.type(screen.getByLabelText("Response for One word?"), "Calm");
    expect(onChange).toHaveBeenLastCalledWith({ text: "m" });

    rerender(
      <WorksheetSessionBlock
        block={{
          ...base,
          type: "reflection",
          title: "What happened?",
          instruction: "Notice.",
          lineCount: 4,
        }}
        onChange={onChange}
        response={{ text: "A pause" }}
      />
    );
    expect(screen.getByLabelText("Response for What happened?")).toHaveValue("A pause");

    rerender(
      <WorksheetSessionBlock
        block={{
          ...base,
          type: "sentence-completion",
          textBefore: "I can",
          textAfter: "today.",
          blankSize: "medium",
        }}
        onChange={onChange}
        response={{ text: "ask for help" }}
      />
    );
    expect(screen.getByLabelText("Complete sentence: I can")).toHaveValue("ask for help");
  });

  it("captures checklist, multiple-choice, and rating selections", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <WorksheetSessionBlock
        block={{
          ...base,
          type: "checklist",
          prompt: "Try",
          items: ["Breathe", "Pause"],
          allowOther: true,
        }}
        onChange={onChange}
        response={{}}
      />
    );
    await user.click(screen.getByRole("checkbox", { name: "Breathe" }));
    expect(onChange).toHaveBeenCalledWith({ selected: [0] });

    rerender(
      <WorksheetSessionBlock
        block={{
          ...base,
          type: "multiple-choice",
          prompt: "Choose",
          options: ["One", "Two"],
          selectionMode: "single",
        }}
        onChange={onChange}
        response={{}}
      />
    );
    await user.click(screen.getByRole("radio", { name: "Two" }));
    expect(onChange).toHaveBeenLastCalledWith({ selected: [1] });

    rerender(
      <WorksheetSessionBlock
        block={{
          ...base,
          type: "rating-scale",
          prompt: "Rate",
          minimum: 1,
          maximum: 3,
          minimumLabel: "Low",
          maximumLabel: "High",
          showNumbers: true,
        }}
        onChange={onChange}
        response={{}}
      />
    );
    await user.click(screen.getByRole("radio", { name: "3" }));
    expect(onChange).toHaveBeenLastCalledWith({ rating: 3 });
  });

  it("captures table, CBT, and coping-plan responses while leaving static blocks static", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <WorksheetSessionBlock
        block={{
          ...base,
          type: "basic-table",
          headers: ["Before", "After"],
          rows: [["", ""]],
        }}
        onChange={onChange}
        response={{}}
      />
    );
    await user.type(screen.getByLabelText("Before row 1"), "Tense");
    expect(onChange).toHaveBeenLastCalledWith({ cells: [["e", ""]] });

    rerender(
      <WorksheetSessionBlock
        block={{
          ...base,
          type: "cbt-thought-check",
          labels: {
            situation: "Situation",
            thought: "Thought",
            feeling: "Feeling",
            evidenceFor: "Evidence For",
            evidenceAgainst: "Evidence Against",
            balancedThought: "Balanced",
          },
          lineCount: 2,
        }}
        onChange={onChange}
        response={{ fields: { situation: "At school" } }}
      />
    );
    expect(screen.getByLabelText("Situation")).toHaveValue("At school");

    rerender(
      <WorksheetSessionBlock
        block={{
          ...base,
          type: "coping-plan",
          triggerPrompt: "Trigger",
          choicesPrompt: "Choices",
          choices: ["Breathe"],
          tryPrompt: "Try",
          helpedPrompt: "Helped",
          lineCount: 2,
        }}
        onChange={onChange}
        response={{}}
      />
    );
    await user.click(screen.getByRole("checkbox", { name: "Breathe" }));
    expect(onChange).toHaveBeenLastCalledWith({ selected: [0] });

    rerender(
      <WorksheetSessionBlock
        block={{
          ...base,
          type: "instruction",
          text: "Read this only",
          alignment: "left",
        }}
        onChange={onChange}
        response={{}}
      />
    );
    expect(screen.getByText("Read this only")).toBeVisible();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
