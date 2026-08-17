import { useState } from "react";

import { IconBrowserField } from "../icons";
import BulkAddPrompts from "./BulkAddPrompts";
import formatPromptDisplayLabel from "./formatPromptDisplayLabel";
import InlineEdit from "./InlineEdit";
import MetadataEditor from "./MetadataEditor";
import PromptColorPicker from "./PromptColorPicker";
import PromptManageCard from "./PromptManageCard";
import CategoryCreationForm from "./CategoryCreationForm";

export default function PromptManageView({
  deck,
  decks,
  categories,
  playlists,
  repositories,
  run,
}) {
  const [newPrompt, setNewPrompt] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  async function addPrompt(event) {
    event.preventDefault();
    await run(() => repositories.decks.addPrompt(deck.id, { text: newPrompt }));
    setNewPrompt("");
  }

  async function move(index, offset) {
    const ids = deck.prompts.map(({ id }) => id);
    const target = index + offset;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await run(() => repositories.decks.reorderPrompts(deck.id, ids));
  }

  return (
    <div className="prompt-manage-view">
      <section className="deck-editor">
        <section className="deck-editor__overview" aria-labelledby="deck-details-title">
          <h2 className="deck-editor__section-label" id="deck-details-title">
            Deck Details
          </h2>
          <div className="deck-editor__copy">
            <InlineEdit
              className="deck-editor__title"
              label="deck title"
              onSave={(title) =>
                run(() => repositories.decks.updatePromptDeck(deck.id, { title }))
              }
              value={deck.title}
            />
            <InlineEdit
              className="deck-editor__description"
              label="deck description"
              multiline
              onSave={(description) =>
                run(() => repositories.decks.updatePromptDeck(deck.id, { description }))
              }
              value={deck.description}
            />
          </div>
        </section>
        <section className="appearance-section" aria-labelledby="appearance-title">
          <div className="appearance-section__header">
            <h2 id="appearance-title">Appearance</h2>
          </div>
          <div className="appearance-editor">
            <div className="appearance-editor__category">
              <label>
                Category
                <select
                  onChange={(event) => {
                    if (event.target.value === "__new__") {
                      setCreatingCategory(true);
                      return;
                    }
                    const selected = categories.find(
                      ({ id }) => id === event.target.value
                    );
                    const category = selected?.name ?? deck.category;
                    void run(() =>
                      repositories.decks.updatePromptDeck(deck.id, {
                        categoryId: event.target.value || null,
                        category,
                      })
                    );
                  }}
                  value={deck.categoryId ?? ""}
                >
                  <option value="">
                    Imported Category: {formatPromptDisplayLabel(deck.category) || "None"}
                  </option>
                  {categories
                    .filter((item) => !item.archived)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {formatPromptDisplayLabel(item.name)}
                      </option>
                    ))}
                  <option value="__new__">+ Add New Category</option>
                </select>
              </label>
              {creatingCategory ? (
                <CategoryCreationForm
                  onCancel={() => setCreatingCategory(false)}
                  onCreate={async (input) => {
                    const category = await run(() =>
                      repositories.categories.createCategory(input)
                    );
                    await run(() =>
                      repositories.decks.updatePromptDeck(deck.id, {
                        categoryId: category.id,
                        category: category.name,
                      })
                    );
                    setCreatingCategory(false);
                  }}
                />
              ) : null}
            </div>
            <PromptColorPicker
              label="Deck Color"
              onSave={(color) =>
                run(() => repositories.decks.updatePromptDeck(deck.id, { color }))
              }
              value={deck.color}
            />
            <IconBrowserField
              label="Deck Icon"
              onSave={(iconId) =>
                run(() => repositories.decks.updatePromptDeck(deck.id, { iconId }))
              }
              value={deck.iconId}
            />
          </div>
        </section>
        <MetadataEditor
          collapsible
          onSave={(changes) =>
            run(() => repositories.decks.updatePromptDeck(deck.id, changes))
          }
          value={deck}
        />
      </section>

      <section className="prompt-list-section">
        <div className="prompt-list-section__header">
          <h2>Prompts</h2>
          <span>{deck.prompts.length} Total</span>
        </div>
        <form
          className="add-prompt authoring-subsection"
          onSubmit={(event) => void addPrompt(event)}
        >
          <label>
            New Prompt
            <textarea
              onChange={(event) => setNewPrompt(event.target.value)}
              value={newPrompt}
            />
          </label>
          <button className="button-primary" disabled={!newPrompt.trim()} type="submit">
            Add Prompt
          </button>
        </form>
        <BulkAddPrompts
          onAdd={(texts) => run(() => repositories.decks.bulkAddPrompts(deck.id, texts))}
        />
        <ol className="prompt-edit-list">
          {deck.prompts.map((prompt, index) => (
            <PromptManageCard
              deck={deck}
              decks={decks}
              index={index}
              key={prompt.id}
              onMove={move}
              playlists={playlists}
              prompt={prompt}
              repositories={repositories}
              run={run}
            />
          ))}
        </ol>
      </section>
    </div>
  );
}
