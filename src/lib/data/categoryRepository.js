import { nanoid } from "nanoid";

import { promptCategorySchema } from "../../models/promptAuthoring";
import { getTherapyStudioDatabase } from "./database";
import { promptAccountDataAdapter } from "./promptAccountDataAdapter";
import {
  assertOnlyFields,
  assertUniqueIds,
  authoringError,
  authoringErrorCodes,
  ensureAuthoringDatabaseOpen,
  rethrowAuthoringError,
  sortedByOrder,
} from "./promptAuthoringRepositoryUtils";

const editableFields = ["name", "color", "iconId"];

function parseCategory(input) {
  const result = promptCategorySchema.safeParse(input);
  if (!result.success) {
    throw authoringError(authoringErrorCodes.invalidInput, "Category is invalid.", {
      cause: result.error,
      details: result.error.issues,
    });
  }
  return result.data;
}

export function createCategoryRepository({
  accountData = promptAccountDataAdapter,
  database = getTherapyStudioDatabase(),
  now = () => new Date().toISOString(),
  createId = () => nanoid(),
} = {}) {
  async function readAll() {
    await ensureAuthoringDatabaseOpen(database);
    return (await database.table("categories").toArray()).map(parseCategory);
  }

  async function currentTaxonomyGeneration() {
    return (await accountData.getCurrentPromptTaxonomyGeneration?.()) ?? null;
  }

  function belongsToCurrentTaxonomy(category, taxonomyGeneration) {
    if (!taxonomyGeneration) return true;
    return category.taxonomyGeneration === taxonomyGeneration;
  }

  async function readCurrentTaxonomy() {
    const taxonomyGeneration = await currentTaxonomyGeneration();
    return (await readAll()).filter((category) =>
      belongsToCurrentTaxonomy(category, taxonomyGeneration)
    );
  }

  async function getAllCategories({ includeArchived = false } = {}) {
    return sortedByOrder(
      (await readCurrentTaxonomy()).filter(
        (category) => includeArchived || !category.archived
      )
    );
  }

  async function getCategoryById(id) {
    await ensureAuthoringDatabaseOpen(database);
    const value = await database.table("categories").get(id);
    if (!value) {
      throw authoringError(authoringErrorCodes.notFound, `Category not found: ${id}`);
    }
    return parseCategory(value);
  }

  async function assertNameAvailable(name, exceptId) {
    const normalized = name.trim().toLocaleLowerCase();
    if (
      (await readCurrentTaxonomy()).some(
        (item) => item.id !== exceptId && item.name.toLocaleLowerCase() === normalized
      )
    ) {
      throw authoringError(
        authoringErrorCodes.duplicate,
        `Category already exists: ${name}`
      );
    }
  }

  async function createCategory(input) {
    assertOnlyFields(input, editableFields);
    await assertNameAvailable(input.name);
    const timestamp = now();
    const taxonomyGeneration = await currentTaxonomyGeneration();
    const category = parseCategory({
      id: createId(),
      name: input.name,
      color: input.color ?? "#6C46C3",
      iconId: input.iconId ?? "prompt-default",
      sortOrder: (await readCurrentTaxonomy()).length,
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(taxonomyGeneration ? { taxonomyGeneration } : {}),
    });
    try {
      await database.table("categories").add(category);
      await accountData.trackCreatedCategory?.(category);
      return category;
    } catch (error) {
      rethrowAuthoringError(
        error,
        authoringErrorCodes.transactionFailed,
        "Category could not be created."
      );
    }
  }

  async function updateCategory(id, changes) {
    assertOnlyFields(changes, editableFields);
    if (changes.name !== undefined) await assertNameAvailable(changes.name, id);
    await ensureAuthoringDatabaseOpen(database);
    try {
      const updated = await database.transaction(
        "rw",
        database.table("categories"),
        async () => {
          const current = await getCategoryById(id);
          const updatedCategory = parseCategory({
            ...current,
            ...changes,
            updatedAt: now(),
          });
          await database.table("categories").put(updatedCategory);
          return updatedCategory;
        }
      );
      await accountData.saveTrackedCategory?.(updated);
      return updated;
    } catch (error) {
      rethrowAuthoringError(
        error,
        authoringErrorCodes.transactionFailed,
        "Category could not be updated."
      );
    }
  }

  async function setArchived(id, archived) {
    await ensureAuthoringDatabaseOpen(database);
    const current = await getCategoryById(id);
    const taxonomyGeneration = await currentTaxonomyGeneration();
    const updated = parseCategory({
      ...current,
      archived,
      updatedAt: now(),
      // An explicit restore is the only route that reintroduces a historical
      // category to the active taxonomy.
      ...(!archived && taxonomyGeneration && !current.taxonomyGeneration
        ? { taxonomyGeneration }
        : {}),
    });
    await database.table("categories").put(updated);
    await accountData.saveTrackedCategory?.(updated);
    return updated;
  }

  async function reorderCategories(orderedIds) {
    const categories = await readCurrentTaxonomy();
    assertUniqueIds(
      orderedIds,
      categories.map(({ id }) => id)
    );
    const updatedCategories = await database.transaction(
      "rw",
      database.table("categories"),
      async () => {
        const updates = [];
        for (const [sortOrder, id] of orderedIds.entries()) {
          const current = await getCategoryById(id);
          const updated = parseCategory({ ...current, sortOrder, updatedAt: now() });
          await database.table("categories").put(updated);
          updates.push(updated);
        }
        return updates;
      }
    );
    await Promise.all(
      updatedCategories.map((category) => accountData.saveTrackedCategory?.(category))
    );
    return getAllCategories({ includeArchived: true });
  }

  async function deleteCategory(id) {
    await ensureAuthoringDatabaseOpen(database);
    await getCategoryById(id);
    await database.table("categories").delete(id);
    await accountData.tombstoneTrackedCategory?.(id);
    return { id };
  }

  return {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    reorderCategories,
    archiveCategory: (id) => setArchived(id, true),
    restoreCategory: (id) => setArchived(id, false),
    deleteCategory,
  };
}

export const categoryRepository = createCategoryRepository();
