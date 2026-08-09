import { getResourceKey } from "../../models/resource";
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

export function assembleSearchResources(staticResources, persistedWorksheets = []) {
  const resourcesByKey = new Map();

  for (const resource of [
    ...staticResources,
    ...validPersistedWorksheets(persistedWorksheets),
  ]) {
    resourcesByKey.set(getResourceKey(resource), resource);
  }

  return [...resourcesByKey.values()];
}

export { validPersistedWorksheets };
