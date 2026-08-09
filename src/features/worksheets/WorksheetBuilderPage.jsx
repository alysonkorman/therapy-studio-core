import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  addWorksheetBlock,
  addWorksheetPage,
  deleteWorksheetBlock,
  deleteWorksheetPage,
  duplicateWorksheetBlock,
  duplicateWorksheetPage,
  moveWorksheetBlock,
  moveWorksheetPage,
  updateWorksheetBlock,
  updateWorksheetPage,
} from "../../engines/worksheets/worksheetDocumentOperations";
import { worksheetRepository } from "../../lib/data";
import WorksheetBlockEditor from "./WorksheetBlockEditor";
import WorksheetDocumentRenderer from "./WorksheetDocumentRenderer";
import "./WorksheetsPage.css";

const worksheetBlockTypes = [
  ["heading", "Heading"],
  ["instruction", "Instruction Text"],
  ["paragraph", "Paragraph"],
  ["short-response", "Short Response"],
  ["long-response", "Long Response"],
  ["checklist", "Checklist"],
  ["multiple-choice", "Multiple Choice"],
  ["rating-scale", "Rating Scale"],
  ["feelings-scale", "Feelings Scale"],
  ["drawing-area", "Drawing Area"],
  ["divider", "Divider"],
  ["spacer", "Spacer"],
];

export default function WorksheetBuilderPage({ repository = worksheetRepository }) {
  const { worksheetId } = useParams();
  const [worksheet, setWorksheet] = useState(null);
  const [draft, setDraft] = useState(null);
  const [pageId, setPageId] = useState("");
  const [blockId, setBlockId] = useState("");
  const [status, setStatus] = useState("Loading…");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      repository.getWorksheetById(worksheetId),
      repository.getWorksheetDocument(worksheetId),
    ])
      .then(([resource, document]) => {
        setWorksheet(resource);
        setDraft(document);
        setPageId(document.pages[0].id);
        setStatus("Saved");
      })
      .catch(() => setError("We couldn’t find that Worksheet."));
  }, [repository, worksheetId]);

  const page = draft?.pages.find(({ id }) => id === pageId);
  const block = page?.blocks.find(({ id }) => id === blockId);
  const blockPosition = page?.blocks.findIndex(({ id }) => id === blockId) ?? -1;
  const change = (next) => {
    setDraft(next);
    setStatus("Unsaved Changes");
  };
  const selectedPageIndex = draft?.pages.findIndex(({ id }) => id === pageId) ?? -1;
  const pageLabel = useMemo(
    () => page?.title || `Page ${selectedPageIndex + 1}`,
    [page, selectedPageIndex]
  );

  async function save() {
    setStatus("Saving…");
    try {
      const saved = await repository.saveWorksheetDocument(worksheetId, draft);
      setDraft(saved);
      setStatus("Saved");
    } catch (caughtError) {
      setStatus("Save Failed");
      setError(caughtError.message);
    }
  }

  if (error && !draft)
    return (
      <section className="worksheet-route-message">
        <h1>Worksheet Not Found</h1>
        <p>{error}</p>
        <Link to="/worksheets">Back to Worksheet Library</Link>
      </section>
    );
  if (!draft || !worksheet || !page)
    return <p role="status">Loading Worksheet Builder…</p>;

  return (
    <div className="worksheet-builder">
      <header className="worksheet-builder-header">
        <div>
          <p className="eyebrow">Worksheet Builder</p>
          <h1>{worksheet.title}</h1>
        </div>
        <div className="worksheet-actions">
          <span aria-live="polite">{status}</span>
          <button onClick={save} type="button">
            {status === "Save Failed" ? "Retry Save" : "Save"}
          </button>
          <Link to={`/worksheets/${worksheetId}/preview`}>Preview</Link>
          <Link to="/worksheets">Leave Builder</Link>
        </div>
      </header>
      {error ? <p role="alert">{error}</p> : null}
      <div className="worksheet-builder-grid">
        <aside className="worksheet-builder-panel" aria-label="Worksheet Pages">
          <h2>Pages</h2>
          <ol>
            {draft.pages.map((candidate, index) => (
              <li key={candidate.id}>
                <button
                  aria-current={candidate.id === pageId ? "page" : undefined}
                  onClick={() => {
                    setPageId(candidate.id);
                    setBlockId("");
                  }}
                  type="button"
                >
                  {candidate.title || `Page ${index + 1}`}
                </button>
              </li>
            ))}
          </ol>
          <button
            onClick={() => {
              const next = addWorksheetPage(draft);
              change(next);
              setPageId(next.pages.at(-1).id);
            }}
            type="button"
          >
            Add Page
          </button>
          <div className="worksheet-actions">
            <button
              disabled={selectedPageIndex === 0}
              onClick={() => change(moveWorksheetPage(draft, pageId, -1))}
              type="button"
            >
              Move Page Up
            </button>
            <button
              disabled={selectedPageIndex === draft.pages.length - 1}
              onClick={() => change(moveWorksheetPage(draft, pageId, 1))}
              type="button"
            >
              Move Page Down
            </button>
            <button
              onClick={() => {
                const next = duplicateWorksheetPage(draft, pageId);
                change(next);
                setPageId(next.pages[selectedPageIndex + 1].id);
              }}
              type="button"
            >
              Duplicate Page
            </button>
            <button
              onClick={() => {
                const next = deleteWorksheetPage(draft, pageId);
                change(next);
                setPageId(next.pages[Math.max(0, selectedPageIndex - 1)].id);
                setBlockId("");
              }}
              type="button"
            >
              Delete Page
            </button>
          </div>
        </aside>
        <main className="worksheet-canvas" aria-label={`${pageLabel} Canvas`}>
          <WorksheetDocumentRenderer
            document={draft}
            onSelectBlock={setBlockId}
            selectedPageId={pageId}
          />
        </main>
        <aside
          className="worksheet-builder-panel worksheet-builder-tools"
          aria-label="Worksheet Tools"
        >
          <section>
            <h2>Block Library</h2>
            <div className="worksheet-block-library">
              {worksheetBlockTypes.map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => {
                    const next = addWorksheetBlock(draft, pageId, type);
                    change(next);
                    setBlockId(
                      next.pages.find(({ id }) => id === pageId).blocks.at(-1).id
                    );
                  }}
                  type="button"
                >
                  Add {label}
                </button>
              ))}
            </div>
          </section>
          {block ? (
            <WorksheetBlockEditor
              block={block}
              key={block.id}
              onApply={(nextBlock) => {
                try {
                  change(updateWorksheetBlock(draft, pageId, block.id, nextBlock));
                  setError("");
                } catch {
                  setError("Block content is incomplete or invalid.");
                }
              }}
              onDelete={() => {
                change(deleteWorksheetBlock(draft, pageId, block.id));
                setBlockId("");
              }}
              onDuplicate={() => change(duplicateWorksheetBlock(draft, pageId, block.id))}
              onMove={(offset) =>
                change(moveWorksheetBlock(draft, pageId, block.id, offset))
              }
              position={blockPosition}
              total={page.blocks.length}
            />
          ) : null}
          <section className="worksheet-settings">
            <h2>Page Settings</h2>
            <label>
              Page Title
              <input
                onChange={(event) =>
                  change(
                    updateWorksheetPage(draft, pageId, { title: event.target.value })
                  )
                }
                value={page.title}
              />
            </label>
            <label>
              Paper Size
              <select
                onChange={(event) =>
                  change(
                    updateWorksheetPage(draft, pageId, {
                      settings: { ...page.settings, paperSize: event.target.value },
                    })
                  )
                }
                value={page.settings.paperSize}
              >
                <option value="letter">Letter</option>
                <option value="a4">A4</option>
              </select>
            </label>
            <label>
              Orientation
              <select
                onChange={(event) =>
                  change(
                    updateWorksheetPage(draft, pageId, {
                      settings: { ...page.settings, orientation: event.target.value },
                    })
                  )
                }
                value={page.settings.orientation}
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </label>
            <label>
              Margins
              <select
                onChange={(event) =>
                  change(
                    updateWorksheetPage(draft, pageId, {
                      settings: { ...page.settings, margin: event.target.value },
                    })
                  )
                }
                value={page.settings.margin}
              >
                <option value="narrow">Narrow</option>
                <option value="normal">Normal</option>
                <option value="wide">Wide</option>
              </select>
            </label>
          </section>
        </aside>
      </div>
    </div>
  );
}
