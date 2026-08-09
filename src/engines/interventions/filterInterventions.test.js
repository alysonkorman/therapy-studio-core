import { describe, expect, it } from "vitest";

import { interventions } from "../../data/resources";
import { filterInterventions } from "./filterInterventions";

describe("filterInterventions", () => {
  it("searches shared Resource metadata", () => {
    expect(filterInterventions(interventions, { query: "interoception" })).toHaveLength(
      1
    );
    expect(filterInterventions(interventions, { query: "interoception" })[0].title).toBe(
      "Body Clues Check-In"
    );
  });

  it("combines restrained goal, age, duration, and telehealth filters", () => {
    expect(
      filterInterventions(interventions, {
        goal: "Emotion identification",
        ageRange: "5–7",
        maxDuration: "10",
        telehealthOnly: true,
      }).map((item) => item.title)
    ).toEqual(["Worry Thermometer", "Body Clues Check-In"]);
  });

  it("returns the original deterministic order", () => {
    expect(filterInterventions(interventions).map((item) => item.id)).toEqual(
      interventions.map((item) => item.id)
    );
  });
});
