import { nanoid } from "nanoid";

import { promptCategorySchema } from "../../models/promptAuthoring";
import { getTherapyStudioDatabase } from "./database";
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
  database = getTherapyStudioDatabase(),
  now = () => new Date().toISOString(),
  createId = () => nanoid(),
} = {}) {
  async function readAll() {
    await ensureAuthoringDatabaseOpen(database);
    return (await database.table("categories").toArray()).map(parseCategory);
  }

  async function getAllCategories({ includeArchived = false } = {}) {
    return sortedByOrder(
      (await readAll()).filter((category) => includeArchived || !category.archived)
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
      (await readAll()).some(
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
    const category = parseCategory({
      id: createId(),
      name: input.name,
      color: input.color ?? "#6C46C3",
      iconId: input.iconId ?? "prompt-default",
      sortOrder: (await readAll()).length,
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    try {
      await database.table("categories").add(category);
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
      return await database.transaction("rw", database.table("categories"), async () => {
        const current = await getCategoryById(id);
        const updated = parseCategory({ ...current, ...changes, updatedAt: now() });
        await database.table("categories").put(updated);
        return updated;
      });
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
    const updated = parseCategory({ ...current, archived, updatedAt: now() });
    await database.table("categories").put(updated);
    return updated;
  }

  async function reorderCategories(orderedIds) {
    const categories = await readAll();
    assertUniqueIds(
      orderedIds,
      categories.map(({ id }) => id)
    );
    await database.transaction("rw", database.table("categories"), async () => {
      for (const [sortOrder, id] of orderedIds.entries()) {
        const current = await getCategoryById(id);
        await database
          .table("categories")
          .put(parseCategory({ ...current, sortOrder, updatedAt: now() }));
      }
    });
    return getAllCategories({ includeArchived: true });
  }

  async function seedCategories(categories) {
    await ensureAuthoringDatabaseOpen(database);
    const validated = categories.map(parseCategory);
    try {
      return await database.transaction("rw", database.table("categories"), async () => {
        let inserted = 0;
        let unchanged = 0;
        const conflicts = [];
        for (const category of validated) {
          const existing = await database.table("categories").get(category.id);
          if (!existing) {
            await database.table("categories").add(category);
            inserted += 1;
          } else if (JSON.stringify(existing) === JSON.stringify(category)) {
            unchanged += 1;
          } else {
            conflicts.push(category.id);
          }
        }
        return { inserted, unchanged, conflicts };
      });
    } catch (error) {
      rethrowAuthoringError(
        error,
        authoringErrorCodes.transactionFailed,
        "Categories could not be seeded."
      );
    }
  }

  return {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    reorderCategories,
    archiveCategory: (id) => setArchived(id, true),
    restoreCategory: (id) => setArchived(id, false),
    seedCategories,
  };
}

export const categoryRepository = createCategoryRepository();
