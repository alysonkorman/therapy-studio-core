import { describe, expect, it } from "vitest";

import {
  browseSceneAssets,
  getSceneAssetCategories,
  SCENE_ASSET_PAGE_SIZE,
} from "./sceneAssetLibrary";

describe("Scene Builder asset-library presentation", () => {
  it("derives child-friendly categories over the shared service taxonomy", () => {
    const categories = getSceneAssetCategories();

    expect(categories[0]).toMatchObject({ id: "all", label: "All" });
    expect(categories.map(({ id }) => id)).toEqual([
      "all",
      "people",
      "animals",
      "places",
      "objects",
      "feelings-symbols",
      "play-imagination",
      "other",
    ]);
    expect(categories.every(({ count }) => count > 0)).toBe(true);
    expect(categories.slice(1).reduce((total, { count }) => total + count, 0)).toBe(
      categories[0].count
    );
  });

  it("pages real manifest records without copying SVG content or URLs", () => {
    const result = browseSceneAssets({ limit: SCENE_ASSET_PAGE_SIZE });

    expect(result.assets).toHaveLength(SCENE_ASSET_PAGE_SIZE);
    expect(result.total).toBeGreaterThan(SCENE_ASSET_PAGE_SIZE);
    expect(result.assets.every(({ assetKind, id }) => assetKind === "icon" && id)).toBe(
      true
    );
    expect(JSON.stringify(result.assets)).not.toMatch(/<svg|\/src\/assets/);
  });

  it("uses the shared search and category metadata together", () => {
    const result = browseSceneAssets({
      categoryId: "animals",
      limit: SCENE_ASSET_PAGE_SIZE,
      query: "dog",
    });

    expect(result.total).toBeGreaterThan(0);
    expect(result.assets.every(({ group }) => group.startsWith("Animals"))).toBe(true);
  });

  it("keeps unmapped canonical groups available through Other", () => {
    const result = browseSceneAssets({
      categoryId: "other",
      limit: SCENE_ASSET_PAGE_SIZE,
      query: "watarun01",
    });

    expect(result.total).toBe(1);
    expect(result.assets[0]).toMatchObject({
      group: "Culture & Holidays",
      id: "curated-culture-holidays-watarun01",
    });
  });
});
