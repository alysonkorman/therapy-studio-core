import { describe, expect, it, vi } from "vitest";

import { getIconGroups } from "./iconGroups";
import { loadIconAsset, loadIconEntry } from "./iconLoader";
import { buildIconManifestEntries, getIconManifest } from "./iconManifest";
import { getFallbackIcon, getIconById, resolveIcon } from "./iconResolver";
import { searchIcons } from "./iconSearch";

describe("icon service", () => {
  it("discovers the deterministic curated manifest with stable unique semantic IDs", () => {
    const manifest = getIconManifest();
    expect(manifest).toHaveLength(2466);
    expect(new Set(manifest.map(({ id }) => id)).size).toBe(2466);
    expect(manifest).toEqual(
      [...manifest].sort((left, right) => {
        return (
          Number(right.featured) - Number(left.featured) ||
          left.group.localeCompare(right.group) ||
          left.label.localeCompare(right.label) ||
          left.id.localeCompare(right.id)
        );
      })
    );
    expect(manifest.find(({ id }) => id === "reading")).toMatchObject({
      group: "Selfcare SVG",
      label: "Reading",
    });
    expect(manifest.every((icon) => !JSON.stringify(icon).includes("/Users/"))).toBe(
      true
    );
    expect(manifest.every((icon) => !("load" in icon) && !("path" in icon))).toBe(true);
  });

  it("detects duplicate semantic IDs without invoking lazy asset loaders", () => {
    const firstLoader = vi.fn();
    const secondLoader = vi.fn();
    expect(() =>
      buildIconManifestEntries({
        "../../assets/icons/flaticon/Curated Redux Organized/Test Group/001-icon.svg":
          firstLoader,
        "../../assets/icons/flaticon/Curated Redux Organized/Test-Group/001-icon.svg":
          secondLoader,
      })
    ).toThrow(/duplicate curated icon ids/i);
    expect(firstLoader).not.toHaveBeenCalled();
    expect(secondLoader).not.toHaveBeenCalled();
  });

  it("preserves folder counts and supplies the All Icons group", () => {
    const groups = getIconGroups();
    expect(groups).toHaveLength(79);
    expect(groups[0]).toEqual({ count: 2466, id: "all", label: "All Icons" });
    expect(groups).toContainEqual({ count: 31, id: "Dinos 3 SVG", label: "Dinos 3 SVG" });
    expect(groups).toContainEqual({
      count: 100,
      id: "Relationships / Human Relations and Emotions SVG",
      label: "Relationships / Human Relations and Emotions SVG",
    });
  });

  it("normalizes search and returns deterministic filtered results", () => {
    const byPunctuation = searchIcons("POLAR__BEAR");
    expect(byPunctuation).toHaveLength(1);
    expect(byPunctuation[0].id).toBe("curated-animals-2-svg-036-polar-bear");
    expect(searchIcons("polar-bear")).toEqual(byPunctuation);
    expect(searchIcons("", { group: "World Food SVG" })).toHaveLength(21);
    expect(searchIcons("curated animals 2 svg 036 polar bear")).toEqual(byPunctuation);
  });

  it("resolves known, legacy, and unknown IDs without rewriting stored values", () => {
    expect(getIconById("ideas")).toMatchObject({ id: "ideas", label: "Ideas" });
    expect(resolveIcon("camping-027-map").id).toBe("curated-camping-svg-027-map");
    expect(resolveIcon("unknown-icon")).toBe(getFallbackIcon());
  });

  it("loads lazily, caches successful assets, and surfaces failures", async () => {
    const loader = vi.fn().mockResolvedValue("/asset.svg");
    const entry = { id: "test-cache", load: loader };
    await expect(loadIconEntry(entry)).resolves.toBe("/asset.svg");
    await expect(loadIconEntry(entry)).resolves.toBe("/asset.svg");
    expect(loader).toHaveBeenCalledTimes(1);

    const failure = new Error("failed icon");
    await expect(
      loadIconEntry({ id: "test-failure", load: vi.fn().mockRejectedValue(failure) })
    ).rejects.toThrow("failed icon");
    await expect(loadIconAsset("ideas")).resolves.toMatch(/\.svg(?:\?|$)/);
    await expect(loadIconAsset("unknown-icon")).resolves.toBeNull();
  });
});
