import compatibility from "./iconCompatibility.generated.json";

const CURATED_ROOT = "../../assets/icons/flaticon/Curated Redux Reorganized/";

const assetLoaders = import.meta.glob(
  "../../assets/icons/flaticon/Curated Redux Reorganized/**/*.svg",
  { import: "default", query: "?url" }
);

const featuredIds = [
  "calm",
  "connection",
  "creative",
  "ideas",
  "movement",
  "nature",
  "playful",
  "reading",
];

const featuredIdsByPath = new Map(
  featuredIds.map((id) => [compatibility.aliases[id], id]).filter(([path]) => path)
);

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

function stablePathHash(value) {
  let hash = 2166136261;
  for (const character of value.normalize("NFC")) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
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
  const featuredId = featuredIdsByPath.get(relativePath);
  const baseId =
    featuredId ?? `curated-${slugify(group)}-${slugify(filename.replace(/\.svg$/i, ""))}`;
  const label = labelOverrides[featuredId] ?? readableLabel(filename);

  return {
    baseId,
    featured: Boolean(featuredId),
    filename,
    group,
    label,
    load,
    relativePath,
  };
}

export function buildIconManifestEntries(loaders) {
  const provisionalEntries = Object.entries(loaders).map(createEntry);
  const baseIdCounts = provisionalEntries.reduce((counts, icon) => {
    counts.set(icon.baseId, (counts.get(icon.baseId) ?? 0) + 1);
    return counts;
  }, new Map());
  const entries = Object.freeze(
    provisionalEntries
      .map((icon) => {
        // Unique paths keep the readable base ID. Only collisions receive this stable,
        // relative-path-derived FNV-1a suffix, independent of discovery order.
        const id =
          baseIdCounts.get(icon.baseId) === 1
            ? icon.baseId
            : `${icon.baseId}-${stablePathHash(icon.relativePath)}`;
        return Object.freeze({
          featured: icon.featured,
          filename: icon.filename,
          group: icon.group,
          id,
          keywords: normalizeIconText(
            `${icon.label} ${icon.filename} ${icon.group} ${id}`
          ),
          label: icon.label,
          load: icon.load,
          relativePath: icon.relativePath,
        });
      })
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
