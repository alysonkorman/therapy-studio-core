import { promptDeckSchema, promptItemSchema } from "../../models/prompt";
import {
  authoringError,
  authoringErrorCodes,
  normalizeMetadataValues,
  sortedByOrder,
} from "./promptAuthoringRepositoryUtils";

export const deckFields = [
  "title",
  "description",
  "category",
  "categoryId",
  "color",
  "iconId",
  "diagnoses",
  "goals",
  "ageRanges",
  "tags",
];
export const promptFields = [
  "text",
  "type",
  "category",
  "subcategory",
  "diagnoses",
  "goals",
  "ageRanges",
  "tags",
  "settings",
  "depth",
  "source",
  "iconId",
];
export const metadataFields = ["diagnoses", "goals", "ageRanges", "tags", "settings"];

export function parseDeck(input) {
  const result = promptDeckSchema.safeParse(input);
  if (!result.success) {
    throw authoringError(authoringErrorCodes.invalidInput, "Prompt Deck is invalid.", {
      cause: result.error,
      details: result.error.issues,
    });
  }
  return result.data;
}

export function parsePrompt(input) {
  const result = promptItemSchema.safeParse(input);
  if (!result.success) {
    throw authoringError(authoringErrorCodes.invalidInput, "Prompt Item is invalid.", {
      cause: result.error,
      details: result.error.issues,
    });
  }
  return result.data;
}

export function recordToDeck(record) {
  if (!record || record.type !== "prompt-deck" || typeof record.archived !== "boolean") {
    throw authoringError(
      authoringErrorCodes.invalidInput,
      "Stored Prompt Deck is invalid."
    );
  }
  const resource = { ...record };
  delete resource.archived;
  return parseDeck(resource);
}

export function deckToRecord(deck, archived = false) {
  return { ...parseDeck(deck), archived };
}

export function preparedPrompt(input, { id, sortOrder }) {
  const normalized = { ...input };
  for (const field of metadataFields) {
    if (field in normalized)
      normalized[field] = normalizeMetadataValues(normalized[field]);
  }
  return parsePrompt({
    id,
    text: normalized.text,
    type: normalized.type ?? "discussion",
    category: normalized.category ?? "",
    subcategory: normalized.subcategory ?? null,
    tags: normalized.tags ?? [],
    ageRanges: normalized.ageRanges ?? [],
    goals: normalized.goals ?? [],
    diagnoses: normalized.diagnoses ?? [],
    settings: normalized.settings ?? [],
    depth: normalized.depth ?? null,
    source: normalized.source ?? "",
    sortOrder,
    ...(normalized.iconId === undefined ? {} : { iconId: normalized.iconId }),
  });
}

export function promptDecksFromResources(resources, includeArchived) {
  return sortedByOrder(
    resources.filter(
      (resource) =>
        resource.type === "prompt-deck" && (includeArchived || !resource.archived)
    )
  );
}

export function assertPromptDeckResource(resource, id) {
  if (resource.type !== "prompt-deck") {
    throw authoringError(authoringErrorCodes.notFound, `Prompt Deck not found: ${id}`);
  }
  return resource;
}
