import { iconManifestEntries } from "./iconManifest";
import compatibility from "./iconCompatibility.generated.json";

const fallbackIcon = Object.freeze({
  featured: false,
  group: "Fallback",
  id: "prompt-default",
  keywords: "default fallback icon",
  label: "Default Icon",
});

const importedAliases = new Map([["curated-selfcare-svg-005-exercise", "movement"]]);
const unmatchedLegacyIds = new Set(compatibility.unmatched.map(({ id }) => id));
const unmatchedLegacyFilenameKeys = new Set(compatibility.unmatchedLegacyFilenameKeys);
const iconsById = new Map(iconManifestEntries.map((icon) => [icon.id, icon]));
const iconsByRelativePath = new Map(
  iconManifestEntries.map((icon) => [icon.relativePath, icon])
);
const iconsByFilename = iconManifestEntries.reduce((index, icon) => {
  const key = icon.filename
    .replace(/\.svg$/i, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const matches = index.get(key) ?? [];
  matches.push(icon);
  index.set(key, matches);
  return index;
}, new Map());

function resolveUniqueLegacyFilename(iconId) {
  const normalizedId = String(iconId ?? "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const numberedFilename = normalizedId.match(/(?:^|-)(\d{3}-.+)$/)?.[1];
  if (unmatchedLegacyFilenameKeys.has(numberedFilename ?? normalizedId)) return null;
  const compatiblePath =
    compatibility.legacyFilenameAliases[numberedFilename ?? normalizedId];
  if (compatiblePath) return iconsByRelativePath.get(compatiblePath) ?? null;
  const matches = iconsByFilename.get(numberedFilename ?? normalizedId) ?? [];
  return matches.length === 1 ? matches[0] : null;
}

function resolveCompatibilityAlias(iconId) {
  const relativePath = compatibility.aliases[iconId];
  return relativePath ? (iconsByRelativePath.get(relativePath) ?? null) : null;
}

export function getFallbackIcon() {
  return fallbackIcon;
}

export function getInternalIconById(iconId) {
  const resolvedId = importedAliases.get(iconId) ?? iconId;
  if (unmatchedLegacyIds.has(resolvedId)) return null;
  return (
    iconsById.get(resolvedId) ??
    resolveCompatibilityAlias(resolvedId) ??
    resolveUniqueLegacyFilename(resolvedId) ??
    null
  );
}

export function getIconById(iconId) {
  const icon = getInternalIconById(iconId);
  if (!icon) return null;
  const { featured, group, id, keywords, label } = icon;
  return { featured, group, id, keywords, label };
}

export function resolveIcon(iconId) {
  return getIconById(iconId) ?? fallbackIcon;
}
