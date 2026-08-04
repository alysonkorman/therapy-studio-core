import { getIconManifest, normalizeIconText } from "./iconManifest";

export function searchIcons(query = "", { group = "all" } = {}) {
  const normalizedQuery = normalizeIconText(query);
  return getIconManifest().filter(
    (icon) =>
      (group === "all" || icon.group === group) &&
      (!normalizedQuery || icon.keywords.includes(normalizedQuery))
  );
}
