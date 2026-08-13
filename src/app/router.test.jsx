import { matchRoutes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { appRoutes, createAppRoutes } from "./router";

const paths = [
  "/",
  "/prompts",
  "/prompts/example-deck",
  "/interventions",
  "/interventions/example-intervention",
  "/games",
  "/games/example-game",
  "/games/example-game/edit",
  "/worksheets",
  "/worksheets/example-worksheet",
  "/worksheets/example-worksheet/build",
  "/worksheets/example-worksheet/preview",
  "/worksheets/example-worksheet/session",
  "/workbooks",
  "/whiteboard",
  "/join/local-session",
  "/scene-builder",
  "/workspace-lab",
  "/clients",
  "/saved",
  "/settings",
];

describe("application routes", () => {
  it.each(paths)("matches %s", (path) => {
    expect(matchRoutes(appRoutes, path)).not.toBeNull();
  });

  it("matches unknown paths through the not-found route", () => {
    const matches = matchRoutes(appRoutes, "/missing-page");

    expect(matches?.at(-1)?.route.path).toBe("*");
  });

  it("keeps the collaborative workspace available as an isolated lab route", () => {
    const matches = matchRoutes(appRoutes, "/workspace-lab");

    expect(matches?.at(-1)?.route.path).toBe("workspace-lab");
  });

  it("excludes the collaborative workspace from production routes", () => {
    const productionRoutes = createAppRoutes({ enableWorkspaceLab: false });
    const matches = matchRoutes(productionRoutes, "/workspace-lab");

    expect(matches?.at(-1)?.route.path).toBe("*");
  });

  it("keeps participant sessions outside the therapist application shell route", () => {
    const matches = matchRoutes(appRoutes, "/join/local-session");

    expect(matches).toHaveLength(1);
    expect(matches?.[0].route.path).toBe("/join/:sessionId");
  });
});
