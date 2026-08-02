import { matchRoutes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { appRoutes } from "./router";

const paths = [
  "/",
  "/prompts",
  "/interventions",
  "/games",
  "/worksheets",
  "/workbooks",
  "/whiteboard",
  "/scene-builder",
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
});
