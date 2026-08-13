import WorksheetBlockRenderer from "./WorksheetBlockRenderer";
import WorksheetSessionBlock from "./WorksheetSessionBlock";
import { useEffect, useState } from "react";

function isTypingTarget(target) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
  );
}

export default function WorksheetDocumentRenderer({
  document,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveBlock,
  onLayoutChange,
  onLayerChange,
  onSetBackground,
  onAddTextAt,
  onSelectBlock,
  selectedBlockId,
  selectedPageId,
  interactive = false,
  onResponseChange,
  responses = document.sessionResponses ?? {},
}) {
  const [guides, setGuides] = useState({ horizontal: false, vertical: false });
  const pages = selectedPageId
    ? document.pages.filter(({ id }) => id === selectedPageId)
    : document.pages;

  useEffect(() => {
    const selectedPage = pages.find((page) =>
      page.blocks.some((block) => block.id === selectedBlockId)
    );
    const selectedBlock = selectedPage?.blocks.find(({ id }) => id === selectedBlockId);
    if (!selectedPage || !selectedBlock || selectedPage.layoutMode !== "freeform") return;
    const onKeyDown = (event) => {
      if (isTypingTarget(event.target)) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        onDuplicateBlock?.(selectedBlock.id);
        return;
      }
      if (["Delete", "Backspace"].includes(event.key)) {
        event.preventDefault();
        onDeleteBlock?.(selectedBlock.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDeleteBlock, onDuplicateBlock, pages, selectedBlockId]);
  return (
    <div className="worksheet-document">
      {pages.map((page, index) => (
        <article
          aria-label={page.title || `Page ${index + 1}`}
          className={`worksheet-paper worksheet-paper--${page.settings.paperSize} worksheet-paper--${page.settings.orientation} worksheet-paper--margin-${page.settings.margin} ${page.layoutMode === "freeform" ? "worksheet-paper--freeform" : ""}`}
          key={page.id}
          onClick={(event) => {
            if (page.layoutMode !== "freeform" || !onAddTextAt) return;
            if (
              event.target instanceof HTMLElement &&
              event.target.closest(
                "button, input, textarea, select, [contenteditable='true']"
              )
            )
              return;
            const rect = event.currentTarget.getBoundingClientRect();
            onAddTextAt({
              x: ((event.clientX - rect.left) / rect.width) * 100,
              y: ((event.clientY - rect.top) / rect.height) * 100,
            });
          }}
        >
          {onSelectBlock && page.layoutMode === "freeform" && guides.vertical ? (
            <span
              aria-hidden="true"
              className="worksheet-center-guide worksheet-center-guide--vertical"
            />
          ) : null}
          {onSelectBlock && page.layoutMode === "freeform" && guides.horizontal ? (
            <span
              aria-hidden="true"
              className="worksheet-center-guide worksheet-center-guide--horizontal"
            />
          ) : null}
          {page.blocks.length ? (
            page.blocks.map((block, blockIndex) => {
              const selected = selectedBlockId === block.id;
              const freeform = page.layoutMode === "freeform";
              const layout = block.layout;
              return (
                <div
                  className={`worksheet-block-shell ${selected ? "worksheet-block-shell--selected" : ""}`}
                  key={block.id}
                  style={
                    freeform && layout
                      ? {
                          height: `${layout.height}%`,
                          left: `${layout.x}%`,
                          top: `${layout.y}%`,
                          width: `${layout.width}%`,
                          zIndex: layout.zIndex,
                        }
                      : undefined
                  }
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
                    onPointerDown={
                      freeform && onLayoutChange && !layout?.locked
                        ? (event) => {
                            event.currentTarget.setPointerCapture?.(event.pointerId);
                            event.currentTarget.dataset.startX = String(event.clientX);
                            event.currentTarget.dataset.startY = String(event.clientY);
                          }
                        : undefined
                    }
                    onPointerUp={
                      freeform && onLayoutChange && !layout?.locked
                        ? (event) => {
                            const startX = Number(event.currentTarget.dataset.startX);
                            const startY = Number(event.currentTarget.dataset.startY);
                            if (!Number.isFinite(startX) || !Number.isFinite(startY))
                              return;
                            const paper = event.currentTarget.closest(".worksheet-paper");
                            const rect = paper?.getBoundingClientRect();
                            if (!rect) return;
                            let nextX = Math.max(
                              0,
                              Math.min(
                                100 - layout.width,
                                layout.x + ((event.clientX - startX) / rect.width) * 100
                              )
                            );
                            let nextY = Math.max(
                              0,
                              Math.min(
                                100 - layout.height,
                                layout.y + ((event.clientY - startY) / rect.height) * 100
                              )
                            );
                            const centerX = nextX + layout.width / 2;
                            const centerY = nextY + layout.height / 2;
                            if (Math.abs(centerX - 50) < 3) nextX = 50 - layout.width / 2;
                            if (Math.abs(centerY - 50) < 3)
                              nextY = 50 - layout.height / 2;
                            setGuides({ horizontal: false, vertical: false });
                            onLayoutChange(block.id, { x: nextX, y: nextY });
                          }
                        : undefined
                    }
                    onPointerMove={
                      freeform && onLayoutChange && !layout?.locked
                        ? (event) => {
                            const startX = Number(event.currentTarget.dataset.startX);
                            const startY = Number(event.currentTarget.dataset.startY);
                            const rect = event.currentTarget
                              .closest(".worksheet-paper")
                              ?.getBoundingClientRect();
                            if (!Number.isFinite(startX) || !rect) return;
                            const x =
                              layout.x + ((event.clientX - startX) / rect.width) * 100;
                            const y =
                              layout.y + ((event.clientY - startY) / rect.height) * 100;
                            setGuides({
                              vertical: Math.abs(x + layout.width / 2 - 50) < 3,
                              horizontal: Math.abs(y + layout.height / 2 - 50) < 3,
                            });
                          }
                        : undefined
                    }
                    onKeyDown={
                      onSelectBlock
                        ? (event) => {
                            if (
                              freeform &&
                              onLayoutChange &&
                              layout &&
                              !layout.locked &&
                              [
                                "ArrowLeft",
                                "ArrowRight",
                                "ArrowUp",
                                "ArrowDown",
                              ].includes(event.key)
                            ) {
                              event.preventDefault();
                              const delta =
                                event.key === "ArrowLeft"
                                  ? { x: -1 }
                                  : event.key === "ArrowRight"
                                    ? { x: 1 }
                                    : event.key === "ArrowUp"
                                      ? { y: -1 }
                                      : { y: 1 };
                              onLayoutChange(block.id, {
                                x: Math.max(
                                  0,
                                  Math.min(100 - layout.width, layout.x + (delta.x ?? 0))
                                ),
                                y: Math.max(
                                  0,
                                  Math.min(100 - layout.height, layout.y + (delta.y ?? 0))
                                ),
                              });
                              return;
                            }
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
                    {interactive || responses[block.id] ? (
                      <WorksheetSessionBlock
                        block={block}
                        onChange={(response) => onResponseChange?.(block.id, response)}
                        readOnly={!interactive}
                        response={responses[block.id]}
                      />
                    ) : (
                      <WorksheetBlockRenderer block={block} />
                    )}
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
                        {block.type === "line" ? "Duplicate Arrow" : "Duplicate"}
                      </button>
                      <button
                        className="worksheet-delete"
                        onClick={() => onDeleteBlock(block.id)}
                        type="button"
                      >
                        Delete
                      </button>
                      {freeform && layout && onLayoutChange ? (
                        <>
                          <button
                            onClick={() =>
                              onLayoutChange(block.id, {
                                width: Math.max(4, layout.width - 5),
                              })
                            }
                            type="button"
                          >
                            Narrower
                          </button>
                          <button
                            onClick={() =>
                              onLayoutChange(block.id, {
                                width: Math.min(100 - layout.x, layout.width + 5),
                              })
                            }
                            type="button"
                          >
                            Wider
                          </button>
                          <button
                            onClick={() =>
                              onLayoutChange(block.id, { locked: !layout.locked })
                            }
                            type="button"
                          >
                            {layout.locked ? "Unlock" : "Lock"}
                          </button>
                          {!(
                            block.type === "visual" &&
                            layout.locked &&
                            layout.zIndex === 0
                          ) ? (
                            <>
                              <button
                                onClick={() => onLayerChange?.(block.id, "forward")}
                                type="button"
                              >
                                Bring Forward
                              </button>
                              <button
                                onClick={() => onLayerChange?.(block.id, "backward")}
                                type="button"
                              >
                                Send Backward
                              </button>
                            </>
                          ) : null}
                          {block.type === "visual" &&
                          !(layout.locked && layout.zIndex === 0) ? (
                            <button
                              onClick={() => onSetBackground?.(block.id)}
                              type="button"
                            >
                              Set as Background
                            </button>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  ) : null}
                  {freeform && selected && layout && !layout.locked && onLayoutChange ? (
                    <button
                      aria-label="Resize selected block"
                      className="worksheet-freeform-resize-handle"
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        event.currentTarget.setPointerCapture?.(event.pointerId);
                        event.currentTarget.dataset.startX = String(event.clientX);
                        event.currentTarget.dataset.startY = String(event.clientY);
                      }}
                      onPointerUp={(event) => {
                        const rect = event.currentTarget
                          .closest(".worksheet-paper")
                          ?.getBoundingClientRect();
                        if (!rect) return;
                        const width = Math.max(
                          4,
                          Math.min(
                            100 - layout.x,
                            layout.width +
                              ((event.clientX -
                                Number(event.currentTarget.dataset.startX)) /
                                rect.width) *
                                100
                          )
                        );
                        const height =
                          block.type === "visual"
                            ? Math.max(
                                2,
                                Math.min(
                                  100 - layout.y,
                                  width / (layout.width / layout.height)
                                )
                              )
                            : Math.max(
                                2,
                                Math.min(
                                  100 - layout.y,
                                  layout.height +
                                    ((event.clientY -
                                      Number(event.currentTarget.dataset.startY)) /
                                      rect.height) *
                                      100
                                )
                              );
                        onLayoutChange(block.id, { width, height });
                      }}
                      type="button"
                    />
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
