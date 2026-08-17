import { z } from "zod";

import { interventionGuidanceSchema } from "./intervention";
import { promptDeckSchema, promptItemSchema } from "./prompt";
import { promptCategorySchema, promptPlaylistSchema } from "./promptAuthoring";
import { resourceSchema } from "./resource";
import { worksheetDocumentSchema } from "./worksheetDocument";
import { worksheetSchema } from "./worksheet";

export const ACCOUNT_DATA_SCHEMA_VERSION = 1;

export const accountDataEntityTypeSchema = z.enum([
  "prompt-deck",
  "intervention",
  "worksheet",
  "category",
  "playlist",
  "preference",
]);

const cloudResourceFields = [
  "id",
  "type",
  "title",
  "description",
  "tags",
  "goals",
  "ageRanges",
  "settings",
  "materials",
  "durationMinutes",
  "telehealthFriendly",
  "source",
  "research",
  "relatedResourceIds",
  "createdAt",
  "updatedAt",
];

const cloudPromptItemFields = [
  "id",
  "text",
  "type",
  "category",
  "subcategory",
  "tags",
  "ageRanges",
  "goals",
  "settings",
  "depth",
  "sortOrder",
  "iconId",
  "source",
];

function pick(source, fields) {
  return Object.fromEntries(fields.map((field) => [field, source[field]]));
}

function parseResource(input, schema) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid-account-content");
  }
  const { archived = false, ...resource } = input;
  const parsed = schema.parse(resource);
  return { archived: z.boolean().parse(archived), resource: parsed };
}

function projectPromptItem(input) {
  return pick(promptItemSchema.parse(input), cloudPromptItemFields);
}

function projectPromptDeck(input) {
  const source = input?.resource
    ? z.object({ archived: z.boolean(), resource: z.unknown() }).strict().parse(input)
    : null;
  const { archived, resource } = parseResource(
    source ? { ...source.resource, archived: source.archived } : input,
    promptDeckSchema
  );
  return {
    archived,
    resource: {
      ...pick(resource, cloudResourceFields),
      category: resource.category,
      categoryId: resource.categoryId,
      color: resource.color,
      iconId: resource.iconId,
      sortOrder: resource.sortOrder,
      prompts: resource.prompts.map(projectPromptItem),
    },
  };
}

function projectIntervention(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid-account-content");
  }
  const { archived, resource } = parseResource(input.resource, resourceSchema);
  if (resource.type !== "intervention") throw new Error("invalid-account-content");
  const guidance = interventionGuidanceSchema.parse(input.guidance);
  if (guidance.resourceId !== resource.id) throw new Error("invalid-account-content");
  return {
    archived,
    resource: pick(resource, cloudResourceFields),
    guidance,
  };
}

function projectWorksheet(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid-account-content");
  }
  const { archived, resource } = parseResource(input.resource, worksheetSchema);
  const parsedDocument = worksheetDocumentSchema.parse(input.document);
  if (parsedDocument.worksheetId !== resource.id)
    throw new Error("invalid-account-content");
  const document = { ...parsedDocument };
  delete document.sessionResponses;
  return {
    archived,
    resource: {
      ...pick(resource, cloudResourceFields),
      category: resource.category,
      color: resource.color,
      iconId: resource.iconId,
      attribution: resource.attribution,
      provenance: resource.provenance,
      format: resource.format,
    },
    document,
  };
}

function projectCategory(input) {
  return promptCategorySchema.parse(input);
}

function projectPlaylist(input) {
  return promptPlaylistSchema.parse(input);
}

export const promptAuthoringPreferenceSchema = z
  .object({
    promptAuthoringAcknowledgmentVersion: z.string().trim().min(1).max(100),
  })
  .strict();

function projectPreference(input) {
  return promptAuthoringPreferenceSchema.parse(input);
}

export function projectAccountDataContent(entityType, input) {
  switch (accountDataEntityTypeSchema.parse(entityType)) {
    case "prompt-deck":
      return projectPromptDeck(input);
    case "intervention":
      return projectIntervention(input);
    case "worksheet":
      return projectWorksheet(input);
    case "category":
      return projectCategory(input);
    case "playlist":
      return projectPlaylist(input);
    case "preference":
      return projectPreference(input);
  }
}

export function accountDataContentId(entityType, content) {
  switch (accountDataEntityTypeSchema.parse(entityType)) {
    case "prompt-deck":
      return content.resource.id;
    case "intervention":
      return content.resource.id;
    case "worksheet":
      return content.resource.id;
    case "category":
    case "playlist":
      return content.id;
    case "preference":
      return "prompt-authoring";
  }
}
