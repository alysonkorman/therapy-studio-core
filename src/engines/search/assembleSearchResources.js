import { getResourceKey } from "../../models/resource";
import { resourceSchema } from "../../models/resource";
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

export function assembleSearchResources(
  staticResources,
  persistedWorksheets = [],
  persistedInterventions = []
) {
  const resourcesByKey = new Map();

  for (const resource of [
    ...staticResources,
    ...validPersistedWorksheets(persistedWorksheets),
    ...validPersistedInterventions(persistedInterventions),
  ]) {
    resourcesByKey.set(getResourceKey(resource), resource);
  }

  return [...resourcesByKey.values()];
}

export { validPersistedInterventions, validPersistedWorksheets };
