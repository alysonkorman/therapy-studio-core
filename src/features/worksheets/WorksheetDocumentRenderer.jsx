import WorksheetBlockRenderer from "./WorksheetBlockRenderer";

export default function WorksheetDocumentRenderer({
  document,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveBlock,
  onSelectBlock,
  selectedBlockId,
  selectedPageId,
}) {
  const pages = selectedPageId
    ? document.pages.filter(({ id }) => id === selectedPageId)
    : document.pages;
  return (
    <div className="worksheet-document">
      {pages.map((page, index) => (
        <article
          aria-label={page.title || `Page ${index + 1}`}
          className={`worksheet-paper worksheet-paper--${page.settings.paperSize} worksheet-paper--${page.settings.orientation} worksheet-paper--margin-${page.settings.margin}`}
          key={page.id}
        >
          {page.blocks.length ? (
            page.blocks.map((block, blockIndex) => {
              const selected = selectedBlockId === block.id;
              return (
                <div
                  className={`worksheet-block-shell ${selected ? "worksheet-block-shell--selected" : ""}`}
                  key={block.id}
                >
                  <div
                    aria-label={
                      onSelectBlock
                        ? `Edit ${block.type.replaceAll("-", " ")} block`
                        : undefined
                    }
                    aria-pressed={selected || undefined}
                    className={`worksheet-rendered-block ${onSelectBlock ? "worksheet-rendered-block--editable" : ""}`}
                    onClick={onSelectBlock ? () => onSelectBlock(block.id) : undefined}
                    onKeyDown={
                      onSelectBlock
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onSelectBlock(block.id);
                            }
                          }
                        : undefined
                    }
                    role={onSelectBlock ? "button" : undefined}
                    tabIndex={onSelectBlock ? 0 : undefined}
                  >
                    <WorksheetBlockRenderer block={block} />
                  </div>
                  {selected && onMoveBlock ? (
                    <div
                      className="worksheet-block-quick-actions"
                      aria-label="Block Actions"
                    >
                      <button
                        aria-label={`Move ${block.type.replaceAll("-", " ")} block up`}
                        disabled={blockIndex === 0}
                        onClick={() => onMoveBlock(block.id, -1)}
                        type="button"
                      >
                        Move Up
                      </button>
                      <button
                        aria-label={`Move ${block.type.replaceAll("-", " ")} block down`}
                        disabled={blockIndex === page.blocks.length - 1}
                        onClick={() => onMoveBlock(block.id, 1)}
                        type="button"
                      >
                        Move Down
                      </button>
                      <button onClick={() => onDuplicateBlock(block.id)} type="button">
                        Duplicate
                      </button>
                      <button
                        className="worksheet-delete"
                        onClick={() => onDeleteBlock(block.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <p className="worksheet-page-empty">Add a block to begin this page.</p>
          )}
        </article>
      ))}
    </div>
  );
}
