import { matchRoutes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { appRoutes } from "./router";

const paths = [
  "/",
  "/prompts",
  "/prompts/example-deck",
  "/interventions",
  "/interventions/example-intervention",
  "/games",
  "/worksheets",
  "/worksheets/example-worksheet",
  "/worksheets/example-worksheet/build",
  "/worksheets/example-worksheet/preview",
  "/worksheets/example-worksheet/session",
  "/workbooks",
  "/whiteboard",
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
});
