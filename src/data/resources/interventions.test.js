import { describe, expect, it, vi } from "vitest";

import { resourceSchema } from "../../models";
import { interventionGuidanceSchema } from "../../models";

describe("intervention seeds", () => {
  it("keeps Feelings Jenga identity and timestamps stable across module reads", async () => {
    const firstRead = (await import("./interventions")).interventions[0];
    vi.resetModules();
    const secondRead = (await import("./interventions")).interventions[0];

    expect(firstRead.id).toBe("intervention-feelings-jenga");
    expect(secondRead.id).toBe(firstRead.id);
    expect(firstRead.createdAt).toBe("2026-08-01T02:45:27.000Z");
    expect(firstRead.updatedAt).toBe("2026-08-01T02:45:27.000Z");
    expect(secondRead.createdAt).toBe(firstRead.createdAt);
    expect(secondRead.updatedAt).toBe(firstRead.updatedAt);
  });

  it("validates the static intervention through the shared Resource schema", async () => {
    const { interventions } = await import("./interventions");

    expect(interventions).toHaveLength(8);
    interventions.forEach((intervention) => {
      expect(resourceSchema.parse(intervention)).toEqual(intervention);
    });
  });

  it("provides validated guidance for every Intervention without invented evidence", async () => {
    const { interventions, interventionGuidanceById } = await import("./interventions");

    interventions.forEach((intervention) => {
      const guidance = interventionGuidanceById.get(intervention.id);
      expect(interventionGuidanceSchema.parse(guidance)).toEqual(guidance);
      expect(JSON.stringify(guidance)).not.toMatch(
        /evidence-based|research-backed|validated/i
      );
    });
  });

});
