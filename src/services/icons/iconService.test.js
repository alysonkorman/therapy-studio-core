import { describe, expect, it, vi } from "vitest";

import { getIconGroups } from "./iconGroups";
import { loadIconAsset, loadIconEntry } from "./iconLoader";
import { buildIconManifestEntries, getIconManifest } from "./iconManifest";
import { getFallbackIcon, getIconById, resolveIcon } from "./iconResolver";
import { searchIcons } from "./iconSearch";

describe("icon service", () => {
  it("discovers the replacement curated icon library", () => {
    const manifest = getIconManifest();
    expect(manifest).toHaveLength(9708);
    expect(new Set(manifest.map(({ id }) => id)).size).toBe(9708);
    expect(manifest.some(({ group }) => group === "Activities & Play")).toBe(true);
    expect(manifest.some(({ group }) => group === "Imported Icons")).toBe(true);
  });

  it("gives colliding normalized paths distinct deterministic IDs without loading assets", () => {
    const firstLoader = vi.fn();
    const secondLoader = vi.fn();
    const forward = buildIconManifestEntries({
      "Test Group/creativity 2.svg": firstLoader,
      "Test Group/creativity-2.svg": secondLoader,
    });
    const reverse = buildIconManifestEntries({
      "Test Group/creativity-2.svg": secondLoader,
      "Test Group/creativity 2.svg": firstLoader,
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

  it("supplies the replacement library groups", () => {
    const groups = getIconGroups();
    expect(groups[0]).toEqual({ count: 9708, id: "all", label: "All Icons" });
    expect(groups.some(({ label }) => label === "Animals & Creatures")).toBe(true);
  });

  it("searches the replacement icon library", () => {
    expect(searchIcons("SCHOOL__WORK").length).toBeGreaterThan(0);
    expect(searchIcons("", { group: "Any Group" })).toEqual([]);
  });

  it("falls back when an icon is unavailable", () => {
    expect(getIconById("ideas")).not.toBeNull();
    expect(resolveIcon("curated-camping-svg-027-map")).toBe(getFallbackIcon());
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
