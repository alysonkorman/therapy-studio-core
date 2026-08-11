import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const legacyRoot = "src/assets/icons/flaticon/Curated Redux Organized/";
const currentRoot = "src/assets/icons/flaticon/Curated_Redux_Resorted_Standardized";
const outputPath = path.join(
  repositoryRoot,
  "src/services/icons/iconCompatibility.generated.json"
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

function normalizeIconText(value) {
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

function legacyIdForPath(relativePath) {
  if (stableIdOverrides[relativePath]) return stableIdOverrides[relativePath];
  const segments = relativePath.split("/");
  const filename = segments.pop();
  return `curated-${slugify(segments.join(" / "))}-${slugify(filename.replace(/\.svg$/i, ""))}`;
}

function legacyFilenameKey(relativePath) {
  return relativePath
    .split("/")
    .at(-1)
    .replace(/\.svg$/i, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function walkSvgFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkSvgFiles(entryPath);
    return entry.isFile() && entry.name.toLocaleLowerCase().endsWith(".svg")
      ? [entryPath]
      : [];
  });
}

function gitBlobHash(filePath) {
  const contents = readFileSync(filePath);
  return createHash("sha1")
    .update(`blob ${contents.length}\0`)
    .update(contents)
    .digest("hex");
}

function findLegacyTree() {
  for (let depth = 0; depth <= 50; depth += 1) {
    const revision = depth === 0 ? "HEAD" : `HEAD~${depth}`;
    try {
      const entries = execFileSync(
        "git",
        ["ls-tree", "-r", "-z", revision, "--", legacyRoot],
        { cwd: repositoryRoot }
      )
        .toString("utf8")
        .split("\0")
        .filter(Boolean);
      if (entries.some((entry) => entry.toLocaleLowerCase().endsWith(".svg"))) {
        return { entries, revision };
      }
    } catch {
      break;
    }
  }
  throw new Error(`Could not find the tracked legacy SVG tree: ${legacyRoot}`);
}

const currentRootPath = path.join(repositoryRoot, currentRoot);
const newPathsByBlob = new Map();
for (const filePath of walkSvgFiles(currentRootPath)) {
  const relativePath = path.relative(currentRootPath, filePath).split(path.sep).join("/");
  const hash = gitBlobHash(filePath);
  const matches = newPathsByBlob.get(hash) ?? [];
  matches.push(relativePath);
  newPathsByBlob.set(hash, matches);
}
for (const matches of newPathsByBlob.values())
  matches.sort((left, right) => left.localeCompare(right));

const { entries: legacyTreeEntries, revision } = findLegacyTree();
const legacyAssets = legacyTreeEntries
  .map((entry) => {
    const match = entry.match(/^\d+ blob ([0-9a-f]+)\t(.+)$/);
    if (!match || !match[2].toLocaleLowerCase().endsWith(".svg")) return null;
    const [, blob, trackedPath] = match;
    const relativePath = trackedPath.slice(legacyRoot.length);
    return {
      blob,
      filenameKey: legacyFilenameKey(relativePath),
      id: legacyIdForPath(relativePath),
      relativePath,
    };
  })
  .filter(Boolean)
  .sort((left, right) => left.id.localeCompare(right.id));

const filenameCounts = legacyAssets.reduce((counts, asset) => {
  counts.set(asset.filenameKey, (counts.get(asset.filenameKey) ?? 0) + 1);
  return counts;
}, new Map());

const aliases = {};
const legacyFilenameAliases = {};
const unmatched = [];
const unmatchedLegacyFilenameKeys = [];
for (const asset of legacyAssets) {
  const currentPath = newPathsByBlob.get(asset.blob)?.[0];
  if (!currentPath) {
    unmatched.push({ id: asset.id, relativePath: asset.relativePath });
    if (filenameCounts.get(asset.filenameKey) === 1) {
      unmatchedLegacyFilenameKeys.push(asset.filenameKey);
    }
    continue;
  }
  aliases[asset.id] = currentPath;
  if (filenameCounts.get(asset.filenameKey) === 1) {
    legacyFilenameAliases[asset.filenameKey] = currentPath;
  }
}

const output = {
  aliases,
  legacyFilenameAliases,
  legacyRoot,
  legacyRevision: revision,
  newRoot: `${currentRoot}/`,
  unmatched,
  unmatchedLegacyFilenameKeys: unmatchedLegacyFilenameKeys.sort((left, right) =>
    left.localeCompare(right)
  ),
  version: 1,
};

writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(
  `Generated ${Object.keys(aliases).length} legacy aliases and ${unmatched.length} unmatched records.`
);
