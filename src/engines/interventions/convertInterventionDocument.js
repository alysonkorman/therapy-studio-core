import { nanoid } from "nanoid";

import {
  INTERVENTION_IMPORT_FORMAT,
  INTERVENTION_IMPORT_VERSION,
  validateInterventionImport,
} from "./importInterventions";

const sectionAliases = new Map(
  Object.entries({
    overview: ["overview", "description", "summary"],
    whenToUse: ["when to use", "use when", "indications"],
    introduction: ["introduction", "introduction language", "script"],
    steps: ["steps", "instructions", "directions", "procedure"],
    therapistPrompts: ["therapist prompts", "prompts"],
    processingQuestions: [
      "processing questions",
      "discussion questions",
      "reflection questions",
    ],
    adaptations: ["adaptations", "modifications"],
    cautions: ["cautions", "considerations", "warnings"],
    materials: ["materials", "supplies"],
    goals: ["goals", "topics", "goals topics"],
    ageRanges: ["age", "ages", "age range", "age fit"],
    duration: ["duration", "time", "length"],
    telehealth: ["telehealth", "telehealth suitability"],
    source: ["source", "author", "attribution", "source attribution"],
    tags: ["tags", "keywords"],
  }).flatMap(([field, aliases]) => aliases.map((alias) => [alias, field]))
);

function normalizeHeading(value) {
  return value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stripListMarker(value) {
  return value.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim();
}

function splitValues(lines) {
  return lines
    .flatMap((line) => stripListMarker(line).split(/\s*[;,]\s*/))
    .map((value) => value.trim())
    .filter(Boolean);
}

function sectionHeading(line) {
  const match = line.match(/^\s*([^:]{2,40}):\s*(.*)$/);
  if (match) {
    const field = sectionAliases.get(normalizeHeading(match[1]));
    if (field) return { field, initial: match[2].trim() };
  }
  const field = sectionAliases.get(normalizeHeading(line));
  return field ? { field, initial: "" } : null;
}

function sourceNotices(text) {
  const patterns = [
    /private use only[^\n]*/gi,
    /do not redistribute[^\n]*/gi,
    /review required[^\n]*/gi,
    /copyright[^\n]*/gi,
  ];
  return [...new Set(patterns.flatMap((pattern) => text.match(pattern) ?? []))];
}

export function convertInterventionText(text) {
  const normalized = String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
  if (!normalized) throw new Error("No readable Intervention text was found.");

  const lines = normalized.split("\n").map((line) => line.trim());
  const sections = new Map();
  const unsectioned = [];
  let title = "";
  let currentField = null;
  let explicitTitleCount = 0;

  for (const line of lines) {
    if (!line) continue;
    const titleMatch = line.match(/^title\s*:\s*(.+)$/i);
    if (titleMatch) {
      explicitTitleCount += 1;
      title ||= titleMatch[1].trim();
      currentField = null;
      continue;
    }
    const heading = sectionHeading(line);
    if (heading) {
      currentField = heading.field;
      if (!sections.has(currentField)) sections.set(currentField, []);
      if (heading.initial) sections.get(currentField).push(heading.initial);
      continue;
    }
    if (currentField) sections.get(currentField).push(line);
    else unsectioned.push(line);
  }

  if (!title) title = stripListMarker(unsectioned.shift() ?? "");
  const scalar = (field) => (sections.get(field) ?? []).join("\n").trim();
  const list = (field) => splitValues(sections.get(field) ?? []);
  const overview = scalar("overview") || unsectioned.join("\n").trim();
  const durationText = scalar("duration");
  const durationMatch = durationText.match(/\d+/);
  const telehealthText = scalar("telehealth").toLocaleLowerCase();
  const telehealthFriendly = /\b(?:yes|friendly|suitable|supported)\b/.test(
    telehealthText
  )
    ? true
    : /\b(?:no|not suitable|in person only)\b/.test(telehealthText)
      ? false
      : null;
  const notices = sourceNotices(normalized);
  const source = scalar("source");
  const sourceStatus = [
    source
      ? "Source attribution was extracted from the supplied material."
      : "Source attribution not provided — review required.",
    ...notices,
  ].join("\n");

  const proposal = {
    title,
    description: overview,
    goals: list("goals"),
    ageRanges: list("ageRanges"),
    tags: list("tags"),
    durationMinutes: durationMatch ? Number(durationMatch[0]) : null,
    materials: list("materials"),
    telehealthFriendly,
    source,
    overview,
    whenToUse: list("whenToUse"),
    introduction: scalar("introduction"),
    steps: list("steps"),
    therapistPrompts: list("therapistPrompts"),
    processingQuestions: list("processingQuestions"),
    adaptations: list("adaptations"),
    cautions: list("cautions"),
    sourceStatus,
  };
  const missing = [
    !proposal.title && "title",
    !proposal.overview && "overview",
    !proposal.introduction && "introduction",
    !proposal.steps.length && "steps",
    !proposal.source && "source/attribution",
  ].filter(Boolean);
  const warnings = [
    ...notices,
    ...(explicitTitleCount > 1
      ? [
          "This source appears to contain multiple interventions; split and import each intervention individually.",
        ]
      : []),
  ];
  return { proposal, missing, warnings, extractedText: normalized };
}

function values(input) {
  if (Array.isArray(input))
    return input
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  return String(input ?? "")
    .split("\n")
    .map((item) => stripListMarker(item))
    .filter(Boolean);
}

export function createInterventionPairFromReview(
  review,
  { id = nanoid(), now = new Date().toISOString() } = {}
) {
  const pair = {
    resource: {
      id,
      type: "intervention",
      title: String(review.title ?? "").trim(),
      description: String(review.description ?? "").trim(),
      tags: values(review.tags),
      worksWellWhen: values(review.whenToUse),
      useWith: [],
      kidsWhoLike: [],
      goals: values(review.goals),
      diagnoses: [],
      ageRanges: values(review.ageRanges),
      settings: [],
      materials: values(review.materials),
      durationMinutes:
        review.durationMinutes === "" || review.durationMinutes == null
          ? null
          : Number(review.durationMinutes),
      telehealthFriendly: review.telehealthFriendly === true,
      source: String(review.source ?? "").trim(),
      research: [],
      myNotes: "",
      rating: null,
      favorite: false,
      relatedResourceIds: [],
      usageCount: 0,
      lastUsedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    guidance: {
      resourceId: id,
      overview: String(review.overview ?? "").trim(),
      whenToUse: values(review.whenToUse),
      introduction: String(review.introduction ?? "").trim(),
      steps: values(review.steps),
      therapistPrompts: values(review.therapistPrompts),
      processingQuestions: values(review.processingQuestions),
      adaptations: values(review.adaptations),
      cautions: values(review.cautions),
      sourceStatus: String(review.sourceStatus ?? "").trim(),
    },
  };
  return validateInterventionImport({
    format: INTERVENTION_IMPORT_FORMAT,
    version: INTERVENTION_IMPORT_VERSION,
    interventions: [pair],
  }).interventions[0];
}
