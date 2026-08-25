import { iconManifestEntries } from "./iconManifest";

const fallbackIcon = Object.freeze({
  featured: false,
  group: "Fallback",
  id: "prompt-default",
  keywords: "default fallback icon",
  label: "Default Icon",
});

const iconsById = new Map(iconManifestEntries.map((icon) => [icon.id, icon]));
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
  const matches = iconsByFilename.get(numberedFilename ?? normalizedId) ?? [];
  return matches.length === 1 ? matches[0] : null;
}

export function getFallbackIcon() {
  return fallbackIcon;
}

export function getInternalIconById(iconId) {
  return iconsById.get(iconId) ?? resolveUniqueLegacyFilename(iconId) ?? null;
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
