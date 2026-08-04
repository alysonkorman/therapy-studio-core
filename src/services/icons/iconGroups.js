import { getIconManifest } from "./iconManifest";

const groups = Object.freeze([
  Object.freeze({ count: getIconManifest().length, id: "all", label: "All Icons" }),
  ...Array.from(
    getIconManifest().reduce((counts, icon) => {
      counts.set(icon.group, (counts.get(icon.group) ?? 0) + 1);
      return counts;
    }, new Map())
  )
    .map(([label, count]) => Object.freeze({ count, id: label, label }))
    .sort((left, right) => left.label.localeCompare(right.label)),
]);

export function getIconGroups() {
  return groups;
}
