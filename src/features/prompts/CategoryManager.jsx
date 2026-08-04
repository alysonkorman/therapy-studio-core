import { ArrowDown, ArrowUp } from "lucide-react";

import { IconBrowserField } from "../icons";
import InlineEdit from "./InlineEdit";
import formatPromptDisplayLabel from "./formatPromptDisplayLabel";
import PromptColorPicker from "./PromptColorPicker";

export default function CategoryManager({ categories, repository, run }) {
  async function move(index, offset) {
    const ids = categories.map(({ id }) => id);
    const target = index + offset;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await run(() => repository.reorderCategories(ids));
  }

  return (
    <section className="authoring-manager">
      <h2>Categories</h2>
      <ol className="authoring-list">
        {categories.map((category, index) => (
          <li key={category.id}>
            <InlineEdit
              label="category name"
              displayValue={formatPromptDisplayLabel(category.name)}
              onSave={(value) =>
                run(() => repository.updateCategory(category.id, { name: value }))
              }
              value={category.name}
            />
            <PromptColorPicker
              key={category.color}
              label={`${formatPromptDisplayLabel(category.name)} Category Color`}
              onSave={(color) =>
                run(() => repository.updateCategory(category.id, { color }))
              }
              value={category.color}
            />
            <IconBrowserField
              label={`${formatPromptDisplayLabel(category.name)} Category Icon`}
              onSave={(iconId) =>
                run(() => repository.updateCategory(category.id, { iconId }))
              }
              value={category.iconId}
            />
            <div className="authoring-actions">
              <button
                disabled={index === 0}
                onClick={() => void move(index, -1)}
                type="button"
              >
                <ArrowUp aria-hidden="true" size={16} />
                Move Up
              </button>
              <button
                disabled={index === categories.length - 1}
                onClick={() => void move(index, 1)}
                type="button"
              >
                <ArrowDown aria-hidden="true" size={16} />
                Move Down
              </button>
              <button
                onClick={() =>
                  void run(() =>
                    category.archived
                      ? repository.restoreCategory(category.id)
                      : repository.archiveCategory(category.id)
                  )
                }
                type="button"
              >
                {category.archived ? "Restore" : "Archive"}
              </button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
