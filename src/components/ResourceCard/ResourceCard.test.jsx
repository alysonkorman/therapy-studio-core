import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createResource } from "../../models";
import ResourceCard from "./ResourceCard";

function makeResource(overrides = {}) {
  return createResource({
    type: "intervention",
    title: "Feelings Jenga",
    description: "Identify and discuss emotions while playing Jenga.",
    worksWellWhen: ["Conversation feels stuck"],
    kidsWhoLike: ["Minecraft"],
    goals: ["Emotion identification"],
    materials: ["Jenga blocks"],
    useWith: ["Emotion prompts"],
    ageRanges: ["8–10"],
    durationMinutes: 15,
    source: "Clinical library",
    research: ["Supporting study"],
    myNotes: "Offer choices.",
    ...overrides,
  });
}

describe("ResourceCard", () => {
  it("renders core resource information and handles an unrated resource", () => {
    render(<ResourceCard resource={makeResource()} />);

    expect(screen.getByText("intervention")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Feelings Jenga" })).toBeInTheDocument();
    expect(screen.getByText(/Identify and discuss emotions/)).toBeInTheDocument();
    expect(screen.getByText("Not rated")).toBeInTheDocument();
    expect(screen.getByText("15 min")).toBeInTheDocument();
    expect(screen.getByText("Telehealth")).toBeInTheDocument();
    expect(screen.getByText("Ages 8–10")).toBeInTheDocument();
    expect(screen.getByText("Conversation feels stuck")).toBeInTheDocument();
    expect(screen.getByText("Minecraft")).toBeInTheDocument();
    expect(screen.getByText("Emotion identification")).toBeInTheDocument();
    expect(screen.getByText("Jenga blocks")).toBeInTheDocument();
    expect(screen.getByText("Emotion prompts")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Add Feelings Jenga to favorites/ })
    ).toBeInTheDocument();
  });

  it("does not render empty optional sections", () => {
    render(
      <ResourceCard
        resource={makeResource({ materials: [], useWith: [], ageRanges: [] })}
      />
    );

    expect(screen.queryByText("Requires")).not.toBeInTheDocument();
    expect(screen.queryByText("Use With")).not.toBeInTheDocument();
    expect(screen.queryByText(/Ages/)).not.toBeInTheDocument();
  });

  it("reveals and hides advanced information", () => {
    render(<ResourceCard resource={makeResource()} />);

    expect(screen.queryByText("Clinical library")).not.toBeInTheDocument();
    expect(screen.queryByText("Supporting study")).not.toBeInTheDocument();
    expect(screen.queryByText("Offer choices.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show Advanced" }));

    expect(screen.getByText("Clinical library")).toBeInTheDocument();
    expect(screen.getByText("Supporting study")).toBeInTheDocument();
    expect(screen.getByText("Offer choices.")).toBeInTheDocument();
    expect(screen.getByText("Used 0 times")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide Advanced" }));

    expect(screen.queryByText("Clinical library")).not.toBeInTheDocument();
    expect(screen.queryByText("Used 0 times")).not.toBeInTheDocument();
  });
});
