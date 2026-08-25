const CURATED_ROOT = "../../assets/icons/flaticon/Curated_Redux_Resorted_Standardized/";

const assetLoaders = import.meta.glob(
  "../../assets/icons/flaticon/Curated_Redux_Resorted_Standardized/**/*.svg",
  { import: "default", query: "?url" }
);

const groupLabels = Object.freeze({
  "activities and play 2": "Activities & Play",
  "animals and creatures": "Animals & Creatures",
  "emotions and therapy": "Emotions & Therapy",
  "emotions and therapy sorted": "Emotions & Therapy",
  "fantasy and imagination": "Fantasy & Imagination",
  "food and kitchen": "Food & Kitchen",
  "home and daily life sorted": "Home & Daily Life",
  "nature and weather": "Nature & Weather",
  "objects and tools sorted": "Objects & Tools",
  "people and relationships sorted": "People & Relationships",
  "places and scenes": "Places & Scenes",
  "school and work sorted": "School & Work",
  "symbols and ui": "Symbols & Communication",
  "transportation and travel": "Transportation & Travel",
});

const rootTagGroups = Object.freeze([
  [/(?:animal|bird|bug|fish|pet|reptile)/, "Animals & Creatures"],
  [/(?:activity|game|play|sport|toy)/, "Activities & Play"],
  [/(?:body|emotion|face|feeling|health|therapy)/, "Emotions & Therapy"],
  [/(?:fantasy|magic|myth|story)/, "Fantasy & Imagination"],
  [/(?:food|kitchen|drink)/, "Food & Kitchen"],
  [/(?:clothing|home|house|daily)/, "Home & Daily Life"],
  [/(?:nature|outdoor|plant|weather)/, "Nature & Weather"],
  [/(?:building|environment|place|scene)/, "Places & Scenes"],
  [/(?:school|study|work)/, "School & Work"],
  [/(?:communication|symbol|ui)/, "Symbols & Communication"],
  [/(?:car|travel|transport)/, "Transportation & Travel"],
  [/(?:culture|holiday)/, "Culture & Holidays"],
  [/(?:person|people|relationship|love)/, "People & Relationships"],
]);

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
    .replace(/\[[^\]]*]/g, " ")
    .replace(/^\d+[\s_-]*/, "")
    .replace(/[\s_-]+/g, " ")
    .trim()
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
}

function groupFor(relativePath, filename) {
  const segments = relativePath.split("/");
  if (segments.length > 1) {
    const normalizedRoot = normalizeIconText(segments[0]);
    return groupLabels[normalizedRoot] ?? segments[0].replaceAll("_", " ");
  }

  const tags = normalizeIconText(
    filename.match(/\[([^\]]+)]/)?.[1] ?? filename.replace(/\.svg$/i, "")
  );
  return rootTagGroups.find(([pattern]) => pattern.test(tags))?.[1] ?? "Imported Icons";
}

function createEntry([modulePath, load]) {
  const relativePath = modulePath.startsWith(CURATED_ROOT)
    ? modulePath.slice(CURATED_ROOT.length)
    : modulePath;
  const segments = relativePath.split("/");
  const filename = segments.pop();
  const group = groupFor(relativePath, filename);
  const baseId = `curated-${slugify(group)}-${slugify(filename.replace(/\.svg$/i, ""))}`;
  const label = readableLabel(filename);

  return {
    baseId,
    featured: false,
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
