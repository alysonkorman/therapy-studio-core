import { normalizeSearchText, tokenizeSearchQuery } from "./normalizeSearchText";
import { resourceSearchFields } from "./resourceSearchFields";
import { scoreSessionContext } from "./scoreSessionContext";

const EXACT_TITLE_SCORE = 1000;
const EXACT_PHRASE_BONUS = 45;
const MATCHED_TOKEN_BONUS = 25;
const ALL_TOKENS_BONUS = 100;

function explanationFor(field, value) {
  if (field.key === "title") return "Matched title";
  if (field.key === "promptText") return "Matched prompt text";
  return `Matched ${field.label}: ${value}`;
}

function scoreResource(resource, normalizedQuery, queryTokens) {
  let score = 0;
  const matchedQueryTokens = new Set();
  const explanations = [];
  const explanationKeys = new Set();

  for (const field of resourceSearchFields) {
    const fieldTokens = new Set();
    let phraseMatched = false;
    let explanationValue = "";

    for (const originalValue of field.values(resource)) {
      const normalizedValue = normalizeSearchText(originalValue);
      if (!normalizedValue) continue;

      const matchingTokens = queryTokens.filter((token) =>
        normalizedValue.includes(token)
      );
      if (!matchingTokens.length) continue;

      matchingTokens.forEach((token) => {
        fieldTokens.add(token);
        matchedQueryTokens.add(token);
      });
      phraseMatched ||= normalizedValue.includes(normalizedQuery);
      explanationValue ||= String(originalValue);
    }

    if (!fieldTokens.size) continue;

    score += field.weight * fieldTokens.size;
    if (phraseMatched && queryTokens.length > 1) score += EXACT_PHRASE_BONUS;

    const explanation = explanationFor(field, explanationValue);
    if (!explanationKeys.has(explanation)) {
      explanationKeys.add(explanation);
      explanations.push(explanation);
    }
  }

  if (!matchedQueryTokens.size) return null;

  if (normalizeSearchText(resource.title) === normalizedQuery) {
    score += EXACT_TITLE_SCORE;
  }
  score += matchedQueryTokens.size * MATCHED_TOKEN_BONUS;
  if (matchedQueryTokens.size === queryTokens.length) score += ALL_TOKENS_BONUS;

  return { resource, score, matches: explanations };
}

export function searchResources(resources, query, { sessionContext = {} } = {}) {
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = tokenizeSearchQuery(query);
  if (!normalizedQuery || !queryTokens.length) return [];

  return resources
    .map((resource) => {
      const queryResult = scoreResource(resource, normalizedQuery, queryTokens);
      if (!queryResult) return null;

      const contextResult = scoreSessionContext(resource, sessionContext);
      return {
        ...queryResult,
        score: queryResult.score + contextResult.score,
        matches: [...queryResult.matches, ...contextResult.matches],
      };
    })
    .filter(Boolean)
    .sort((first, second) => {
      if (first.score !== second.score) return second.score - first.score;

      const titleComparison = normalizeSearchText(first.resource.title).localeCompare(
        normalizeSearchText(second.resource.title)
      );
      if (titleComparison) return titleComparison;

      const typeComparison = first.resource.type.localeCompare(second.resource.type);
      if (typeComparison) return typeComparison;

      return first.resource.id.localeCompare(second.resource.id);
    });
}

export const resourceSearchWeights = {
  exactTitle: EXACT_TITLE_SCORE,
  exactPhrase: EXACT_PHRASE_BONUS,
  matchedToken: MATCHED_TOKEN_BONUS,
  allTokens: ALL_TOKENS_BONUS,
  fields: Object.fromEntries(
    resourceSearchFields.map((field) => [field.key, field.weight])
  ),
};
