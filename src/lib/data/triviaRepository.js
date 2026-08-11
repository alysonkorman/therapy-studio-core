import { nanoid } from "nanoid";

import { triviaSets } from "../../data/resources";
import { triviaGameSchema } from "../../models";
import {
  createResourceRecord,
  deleteResourcePermanently,
  getAllResources,
  getResourceById,
  updateResourceRecord,
} from "./resourceRepository";

const starterIds = new Set(triviaSets.map(({ id }) => id));

export const triviaRepositoryErrorCodes = Object.freeze({
  invalidTrivia: "invalid-trivia",
  triviaNotFound: "trivia-not-found",
  protectedStarter: "protected-starter",
});

export class TriviaRepositoryError extends Error {
  constructor(code, message, { cause } = {}) {
    super(message, { cause });
    this.name = "TriviaRepositoryError";
    this.code = code;
  }
}

const clone = (value) => structuredClone(value);

function parseTrivia(input) {
  const result = triviaGameSchema.safeParse(input);
  if (!result.success) {
    throw new TriviaRepositoryError(
      triviaRepositoryErrorCodes.invalidTrivia,
      result.error.issues[0]?.message ?? "Trivia Set is invalid.",
      { cause: result.error }
    );
  }
  return result.data;
}

export function createTriviaRepository({
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
  async function getAllTriviaSets() {
    const persisted = (await resources.getAllResources())
      .filter(({ archived, type }) => !archived && type === "game")
      .map((record) => {
        const { archived, ...resource } = record;
        void archived;
        return { ...parseTrivia(resource), starter: false };
      });
    return [
      ...triviaSets.map((set) => ({ ...clone(set), starter: true })),
      ...persisted,
    ].sort(
      (first, second) =>
        Number(first.starter) - Number(second.starter) ||
        first.title.localeCompare(second.title) ||
        first.id.localeCompare(second.id)
    );
  }

  async function getTriviaSetById(id) {
    const starter = triviaSets.find((set) => set.id === id);
    if (starter) return { ...clone(starter), starter: true };
    try {
      const { archived, ...resource } = await resources.getResourceById(id);
      if (archived || resource.type !== "game") throw new Error("not found");
      return { ...parseTrivia(resource), starter: false };
    } catch (error) {
      if (error instanceof TriviaRepositoryError) throw error;
      throw new TriviaRepositoryError(
        triviaRepositoryErrorCodes.triviaNotFound,
        `Trivia Set not found: ${id}`,
        { cause: error }
      );
    }
  }

  async function createTriviaSet(input, { id = createId() } = {}) {
    const timestamp = now();
    const trivia = parseTrivia({
      id,
      type: "game",
      gameKind: "trivia",
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
      color: input.color ?? "#6C46C3",
      difficulty: input.difficulty ?? "mixed",
      contentVersion: 1,
      pointsEnabled: input.pointsEnabled ?? false,
      questions: input.questions ?? [],
    });
    const { archived, ...created } = await resources.createResourceRecord(trivia);
    void archived;
    return { ...parseTrivia(created), starter: false };
  }

  async function updateTriviaSet(id, changes) {
    if (starterIds.has(id)) {
      throw new TriviaRepositoryError(
        triviaRepositoryErrorCodes.protectedStarter,
        "Duplicate this Therapy Studio starter before editing it."
      );
    }
    const current = await getTriviaSetById(id);
    const { starter, archived, ...candidate } = { ...current, ...changes };
    void starter;
    void archived;
    const validated = parseTrivia(candidate);
    const protectedFields = new Set(["id", "createdAt", "updatedAt", "type", "gameKind"]);
    const update = Object.fromEntries(
      Object.entries(validated).filter(([key]) => !protectedFields.has(key))
    );
    const { archived: ignored, ...saved } = await resources.updateResourceRecord(
      id,
      update
    );
    void ignored;
    return { ...parseTrivia(saved), starter: false };
  }

  async function duplicateTriviaSet(id) {
    const source = await getTriviaSetById(id);
    const copyId = createId();
    return createTriviaSet(
      {
        ...source,
        title: `${source.title} Copy`,
        questions: source.questions.map((question, index) => ({
          ...question,
          id: createId(),
          sortOrder: index,
        })),
      },
      { id: copyId }
    );
  }

  async function deleteTriviaSet(id) {
    if (starterIds.has(id)) {
      throw new TriviaRepositoryError(
        triviaRepositoryErrorCodes.protectedStarter,
        "Therapy Studio starter Trivia Sets cannot be deleted."
      );
    }
    await getTriviaSetById(id);
    await resources.deleteResourcePermanently(id);
  }

  return {
    createTriviaSet,
    deleteTriviaSet,
    duplicateTriviaSet,
    getAllTriviaSets,
    getTriviaSetById,
    updateTriviaSet,
  };
}

export const triviaRepository = createTriviaRepository();
