import { getResourceKey } from "../../models/resource";
import { resourceSchema } from "../../models/resource";
import { triviaGameSchema } from "../../models/game";
import { worksheetSchema } from "../../models/worksheet";

function validPersistedWorksheets(records) {
  return records.flatMap((record) => {
    if (!record || record.archived) return [];
    const { archived, ...resource } = record;
    void archived;
    const result = worksheetSchema.safeParse(resource);
    return result.success ? [result.data] : [];
  });
}

function validPersistedInterventions(records) {
  return records.flatMap((record) => {
    if (!record || record.archived || record.type !== "intervention") return [];
    const { archived, starter, ...resource } = record;
    void archived;
    void starter;
    const result = resourceSchema.safeParse(resource);
    return result.success ? [result.data] : [];
  });
}

function validPersistedGames(records) {
  return records.flatMap((record) => {
    if (!record || record.archived || record.type !== "game") return [];
    const { archived, ...resource } = record;
    void archived;
    const result = triviaGameSchema.safeParse(resource);
    return result.success ? [result.data] : [];
  });
}

export function assembleSearchResources(
  staticResources,
  persistedWorksheets = [],
  persistedInterventions = [],
  persistedGames = []
) {
  const resourcesByKey = new Map();

  for (const resource of [
    ...staticResources,
    ...validPersistedWorksheets(persistedWorksheets),
    ...validPersistedInterventions(persistedInterventions),
    ...validPersistedGames(persistedGames),
  ]) {
    resourcesByKey.set(getResourceKey(resource), resource);
  }

  return [...resourcesByKey.values()];
}

export { validPersistedGames, validPersistedInterventions, validPersistedWorksheets };
