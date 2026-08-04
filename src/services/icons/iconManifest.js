const CURATED_ROOT = "../../assets/icons/flaticon/Curated Redux Organized/";

const assetLoaders = import.meta.glob(
  "../../assets/icons/flaticon/Curated Redux Organized/**/*.svg",
  { import: "default", query: "?url" }
);

const stableIdOverrides = {
  "Hobbies SVG/009-drawing.svg": "creative",
  "Nature 1 SVG/020-rainbow.svg": "nature",
  "Selfcare SVG/001-reading.svg": "reading",
  "Selfcare SVG/005-exercise.svg": "movement",
  "Selfcare SVG/006-family.svg": "connection",
  "Selfcare SVG/008-laughing.svg": "playful",
  "Selfcare SVG/022-positive thinking.svg": "ideas",
  "Selfcare SVG/029-meditation.svg": "calm",
};

const labelOverrides = {
  calm: "Calm",
  connection: "Family Connection",
  creative: "Creative",
  ideas: "Ideas",
  movement: "Movement",
  nature: "Nature",
  playful: "Playful",
  reading: "Reading",
};

export function normalizeIconText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function slugify(value) {
  return normalizeIconText(value).replaceAll(" ", "-") || "icon";
}

function readableLabel(filename) {
  return filename
    .replace(/\.svg$/i, "")
    .replace(/^\d+[\s_-]*/, "")
    .replace(/[\s_-]+/g, " ")
    .trim()
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
}

function createEntry([modulePath, load]) {
  const relativePath = modulePath.slice(CURATED_ROOT.length);
  const segments = relativePath.split("/");
  const filename = segments.pop();
  const group = segments.join(" / ").trim();
  const id =
    stableIdOverrides[relativePath] ??
    `curated-${slugify(group)}-${slugify(filename.replace(/\.svg$/i, ""))}`;
  const label = labelOverrides[id] ?? readableLabel(filename);

  return Object.freeze({
    featured: Boolean(stableIdOverrides[relativePath]),
    filename,
    group,
    id,
    keywords: normalizeIconText(`${label} ${filename} ${group} ${id}`),
    label,
    load,
  });
}

export function buildIconManifestEntries(loaders) {
  const entries = Object.freeze(
    Object.entries(loaders)
      .map(createEntry)
      .sort(
        (left, right) =>
          Number(right.featured) - Number(left.featured) ||
          left.group.localeCompare(right.group) ||
          left.label.localeCompare(right.label) ||
          left.id.localeCompare(right.id)
      )
  );

  const duplicateIds = Array.from(
    entries.reduce((counts, icon) => {
      counts.set(icon.id, (counts.get(icon.id) ?? 0) + 1);
      return counts;
    }, new Map())
  ).filter(([, count]) => count > 1);

  if (duplicateIds.length) {
    throw new Error(
      `Duplicate curated icon IDs: ${duplicateIds.map(([id]) => id).join(", ")}`
    );
  }

  return entries;
}

export const iconManifestEntries = buildIconManifestEntries(assetLoaders);

const publicManifest = Object.freeze(
  iconManifestEntries.map(({ featured, group, id, keywords, label }) =>
    Object.freeze({ featured, group, id, keywords, label })
  )
);

export function getIconManifest() {
  return publicManifest;
}
