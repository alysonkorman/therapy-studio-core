import { describe, expect, it } from "vitest";

import { sessionCanvasTemplates } from "../../data/sessionCanvasTemplates";
import { sessionCanvasTemplateSchema } from "../../models/sessionCanvasTemplate";
import { instantiateSessionCanvasTemplate } from "./sessionCanvasTemplates";

function ids() {
  let index = 0;
  return () => `fresh-${++index}`;
}

describe("Session Canvas Templates", () => {
  it("validates the three Therapy Studio starter templates", () => {
    expect(sessionCanvasTemplates).toHaveLength(3);
    sessionCanvasTemplates.forEach((template) =>
      expect(() => sessionCanvasTemplateSchema.parse(template)).not.toThrow()
    );
    expect(sessionCanvasTemplates.map(({ title }) => title)).toEqual([
      "Feelings Thermometer",
      "Blank Shield",
      "Blank Canvas",
    ]);
    expect(Object.isFrozen(sessionCanvasTemplates[0].objects[0])).toBe(true);
  });

  it("rejects duplicate template object IDs", () => {
    const template = structuredClone(sessionCanvasTemplates[1]);
    template.objects[1].id = template.objects[0].id;
    expect(() => sessionCanvasTemplateSchema.parse(template)).toThrow(
      "Canvas object IDs must be unique"
    );
  });

  it("builds the thermometer and shield with practical editable structures", () => {
    const thermometer = sessionCanvasTemplates[0];
    expect(thermometer.objects.filter(({ kind }) => kind === "rectangle")).toHaveLength(
      5
    );
    expect(thermometer.objects.filter(({ kind }) => kind === "text")).toHaveLength(10);
    expect(
      new Set(
        thermometer.objects
          .filter(({ kind }) => kind === "rectangle")
          .map(({ fillColor }) => fillColor)
      ).size
    ).toBe(5);
    expect(sessionCanvasTemplates[1].objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "stroke", points: expect.any(Array) }),
        expect.objectContaining({ kind: "text" }),
      ])
    );
    expect(sessionCanvasTemplates[2].objects).toEqual([]);
  });

  it("creates pristine independent copies with fresh document and object IDs", () => {
    const template = sessionCanvasTemplates[0];
    const createId = ids();
    const first = instantiateSessionCanvasTemplate(template, {
      createId,
      now: "2026-08-11T12:00:00.000Z",
    });
    first.objects[0].fillColor = "#FFFFFF";
    const second = instantiateSessionCanvasTemplate(template, {
      createId,
      now: "2026-08-11T12:01:00.000Z",
    });
    expect(first.id).not.toBe(second.id);
    expect(first.objects.map(({ id }) => id)).not.toEqual(
      second.objects.map(({ id }) => id)
    );
    expect(second.objects[0].fillColor).toBe("#2F766D");
    expect(template.objects[0].fillColor).toBe("#2F766D");
  });
});
