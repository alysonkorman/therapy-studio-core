import { describe, expect, it, vi } from "vitest";

import compatibility from "./iconCompatibility.generated.json";
import { getIconGroups } from "./iconGroups";
import { loadIconAsset, loadIconEntry } from "./iconLoader";
import { buildIconManifestEntries, getIconManifest } from "./iconManifest";
import { getFallbackIcon, getIconById, resolveIcon } from "./iconResolver";
import { searchIcons } from "./iconSearch";

describe("icon service", () => {
  it("discovers the deterministic curated manifest with stable unique semantic IDs", () => {
    const manifest = getIconManifest();
    expect(manifest).toHaveLength(7768);
    expect(new Set(manifest.map(({ id }) => id)).size).toBe(7768);
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
      group: "Other & Unsorted",
      label: "Reading",
    });
    expect(manifest.every((icon) => !JSON.stringify(icon).includes("/Users/"))).toBe(
      true
    );
    expect(manifest.every((icon) => !("load" in icon) && !("path" in icon))).toBe(true);
  });

  it("gives colliding normalized paths distinct deterministic IDs without loading assets", () => {
    const firstLoader = vi.fn();
    const secondLoader = vi.fn();
    const root = "../../assets/icons/flaticon/Curated Redux Reorganized/";
    const forward = buildIconManifestEntries({
      [`${root}Test Group/creativity 2.svg`]: firstLoader,
      [`${root}Test Group/creativity-2.svg`]: secondLoader,
    });
    const reverse = buildIconManifestEntries({
      [`${root}Test Group/creativity-2.svg`]: secondLoader,
      [`${root}Test Group/creativity 2.svg`]: firstLoader,
    });

    expect(forward.map(({ id }) => id)).toHaveLength(2);
    expect(new Set(forward.map(({ id }) => id)).size).toBe(2);
    expect(forward.map(({ id }) => id)).toEqual(reverse.map(({ id }) => id));
    expect(forward.every(({ id }) => /^curated-test-group-creativity-2-/.test(id))).toBe(
      true
    );
    expect(firstLoader).not.toHaveBeenCalled();
    expect(secondLoader).not.toHaveBeenCalled();
  });

  it("preserves folder counts and supplies the All Icons group", () => {
    const groups = getIconGroups();
    expect(groups).toHaveLength(56);
    expect(groups[0]).toEqual({ count: 7768, id: "all", label: "All Icons" });
    expect(groups).toContainEqual({
      count: 7,
      id: "Culture & Religion",
      label: "Culture & Religion",
    });
  });

  it("normalizes search and returns deterministic filtered results", () => {
    const byPunctuation = searchIcons("POLAR__BEAR");
    expect(byPunctuation.length).toBeGreaterThan(0);
    expect(searchIcons("polar-bear")).toEqual(byPunctuation);
    const compatiblePolarBear = getIconById("curated-animals-2-svg-036-polar-bear");
    expect(compatiblePolarBear).not.toBeNull();
    expect(byPunctuation).toContainEqual(compatiblePolarBear);
    expect(searchIcons("", { group: "Culture & Religion" })).toHaveLength(7);
  });

  it("resolves current and byte-identical legacy IDs while unmatched IDs fall back", () => {
    expect(getIconById("ideas")).toMatchObject({ id: "ideas", label: "Ideas" });
    const legacyMap = getIconById("curated-camping-svg-027-map");
    expect(legacyMap).not.toBeNull();
    expect(resolveIcon("camping-027-map")).toEqual(legacyMap);
    expect(compatibility.aliases).toHaveProperty(
      "curated-camping-svg-027-map",
      "Transportation & Travel/map 7.svg"
    );
    expect(Object.keys(compatibility.aliases)).toHaveLength(2427);
    expect(compatibility.unmatched).toHaveLength(39);
    expect(resolveIcon("curated-animals-1-svg-001-rabbit")).toBe(getFallbackIcon());
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
