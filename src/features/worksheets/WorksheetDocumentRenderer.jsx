import WorksheetBlockRenderer from "./WorksheetBlockRenderer";

export default function WorksheetDocumentRenderer({
  document,
  selectedPageId,
  onSelectBlock,
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
            page.blocks.map((block) => (
              <div
                className={`worksheet-rendered-block ${onSelectBlock ? "worksheet-rendered-block--editable" : ""}`}
                key={block.id}
                onClick={onSelectBlock ? () => onSelectBlock(block.id) : undefined}
                onKeyDown={
                  onSelectBlock
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ")
                          onSelectBlock(block.id);
                      }
                    : undefined
                }
                role={onSelectBlock ? "button" : undefined}
                tabIndex={onSelectBlock ? 0 : undefined}
              >
                <WorksheetBlockRenderer block={block} />
              </div>
            ))
          ) : (
            <p className="worksheet-page-empty">Add a block to begin this page.</p>
          )}
        </article>
      ))}
    </div>
  );
}
