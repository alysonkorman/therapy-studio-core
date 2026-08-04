import { getInternalIconById } from "./iconResolver";

const loadedAssets = new Map();

export async function loadIconEntry(entry) {
  if (!loadedAssets.has(entry.id)) loadedAssets.set(entry.id, entry.load());
  try {
    return await loadedAssets.get(entry.id);
  } catch (error) {
    loadedAssets.delete(entry.id);
    throw error;
  }
}

export async function loadIconAsset(iconId) {
  const icon = getInternalIconById(iconId);
  return icon ? loadIconEntry(icon) : null;
}
