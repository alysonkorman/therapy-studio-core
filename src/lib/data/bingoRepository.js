import { nanoid } from "nanoid";

import { bingoSets } from "../../data/resources";
import { bingoGameSchema } from "../../models";
import {
  createResourceRecord,
  deleteResourcePermanently,
  getAllResources,
  getResourceById,
  updateResourceRecord,
} from "./resourceRepository";

const clone = (value) => structuredClone(value);

function parseBingo(input) {
  const result = bingoGameSchema.safeParse(input);
  if (!result.success)
    throw new Error(result.error.issues[0]?.message ?? "Bingo Set is invalid.");
  return result.data;
}

export function createBingoRepository({
  resources = {
    createResourceRecord,
    deleteResourcePermanently,
    getAllResources,
    getResourceById,
    updateResourceRecord,
  },
  createId = () => nanoid(),
  now = () => new Date().toISOString(),
} = {}) {
  async function getAllBingoSets() {
    const persisted = (await resources.getAllResources())
      .filter(
        ({ archived, gameKind, type }) =>
          !archived && type === "game" && gameKind === "bingo"
      )
      .map(({ archived, ...resource }) => {
        void archived;
        return { ...parseBingo(resource), starter: false };
      });
    return [
      ...bingoSets.map((set) => ({ ...clone(set), starter: true })),
      ...persisted,
    ].sort(
      (first, second) =>
        Number(first.starter) - Number(second.starter) ||
        first.title.localeCompare(second.title) ||
        first.id.localeCompare(second.id)
    );
  }

  async function getBingoSetById(id) {
    const starter = bingoSets.find((set) => set.id === id);
    if (starter) return { ...clone(starter), starter: true };
    const { archived, ...resource } = await resources.getResourceById(id);
    if (archived || resource.gameKind !== "bingo") {
      throw new Error(`Bingo Set not found: ${id}`);
    }
    return { ...parseBingo(resource), starter: false };
  }

  async function createBingoSet(input, { id = createId() } = {}) {
    const timestamp = now();
    const bingo = parseBingo({
      id,
      type: "game",
      gameKind: "bingo",
      title: input.title?.trim(),
      description: input.description ?? "",
      tags: input.tags ?? [],
      worksWellWhen: input.worksWellWhen ?? [],
      useWith: input.useWith ?? [],
      kidsWhoLike: input.kidsWhoLike ?? [],
      goals: input.goals ?? [],
      diagnoses: input.diagnoses ?? [],
      ageRanges: input.ageRanges ?? [],
      settings: input.settings ?? [],
      materials: input.materials ?? [],
      durationMinutes: input.durationMinutes ?? 20,
      telehealthFriendly: true,
      source: "Therapist-created in Therapy Studio",
      research: [],
      myNotes: "",
      rating: null,
      favorite: false,
      relatedResourceIds: [],
      usageCount: 0,
      lastUsedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      category: input.category ?? "",
      iconId: input.iconId ?? null,
      color: input.color ?? "#3F7C72",
      boardSize: input.boardSize ?? 3,
      useFreeSpace: input.useFreeSpace ?? true,
      contentVersion: 1,
      items: input.items ?? [{ id: createId(), text: "First item", sortOrder: 0 }],
    });
    const { archived, ...created } = await resources.createResourceRecord(bingo);
    void archived;
    return { ...parseBingo(created), starter: false };
  }

  async function updateBingoSet(id, changes) {
    if (bingoSets.some((set) => set.id === id))
      throw new Error("Duplicate this Therapy Studio starter before editing it.");
    const current = await getBingoSetById(id);
    const { starter, archived, ...candidate } = { ...current, ...changes };
    void starter;
    void archived;
    const validated = parseBingo(candidate);
    const protectedFields = new Set(["id", "createdAt", "updatedAt", "type", "gameKind"]);
    const update = Object.fromEntries(
      Object.entries(validated).filter(([key]) => !protectedFields.has(key))
    );
    const { archived: ignored, ...saved } = await resources.updateResourceRecord(id, update);
    void ignored;
    return { ...parseBingo(saved), starter: false };
  }

  async function duplicateBingoSet(id) {
    const source = await getBingoSetById(id);
    return createBingoSet({
      ...source,
      title: `${source.title} Copy`,
      items: source.items.map((item, sortOrder) => ({
        ...item,
        id: createId(),
        sortOrder,
      })),
    });
  }

  async function deleteBingoSet(id) {
    if (bingoSets.some((set) => set.id === id))
      throw new Error("Therapy Studio starter Bingo Sets cannot be deleted.");
    await getBingoSetById(id);
    await resources.deleteResourcePermanently(id);
  }

  return {
    createBingoSet,
    deleteBingoSet,
    duplicateBingoSet,
    getAllBingoSets,
    getBingoSetById,
    updateBingoSet,
  };
}

export const bingoRepository = createBingoRepository();
