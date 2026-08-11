import { useState } from "react";

import {
  convertWorksheetText,
  createWorksheetPairFromConversion,
} from "../../engines/worksheets/convertWorksheetDocument";
import { extractWorksheetFile } from "../../engines/worksheets/extractWorksheetDocument";

const fileTypes = {
  txt: { accept: ".txt,text/plain", label: "TXT file" },
  docx: {
    accept:
      ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    label: "DOCX file",
  },
  pdf: { accept: ".pdf,application/pdf", label: "text-based PDF" },
};

const changeableTypes = [
  "heading",
  "instruction",
  "paragraph",
  "short-response",
  "long-response",
  "reflection",
];

function blockContent(block) {
  if (["heading", "instruction", "paragraph"].includes(block.type)) return block.text;
  if (["short-response", "long-response"].includes(block.type)) return block.prompt;
  if (block.type === "reflection") return block.title;
  if (block.type === "checklist") return [block.prompt, ...block.items].join("\n");
  if (block.type === "multiple-choice")
    return [block.prompt, ...block.options].join("\n");
  if (block.type === "rating-scale")
    return `${block.prompt}\n${block.minimum}\n${block.maximum}\n${block.minimumLabel}\n${block.maximumLabel}`;
  if (block.type === "sentence-completion")
    return `${block.textBefore}\n${block.textAfter}`;
  if (block.type === "basic-table")
    return [block.headers, ...block.rows].map((row) => row.join("\t")).join("\n");
  if (block.type === "cbt-thought-check") return Object.values(block.labels).join("\n");
  if (block.type === "coping-plan")
    return [
      block.triggerPrompt,
      block.choicesPrompt,
      ...block.choices,
      block.tryPrompt,
      block.helpedPrompt,
    ].join("\n");
  return block.prompt ?? block.label ?? "";
}

function withContent(block, value) {
  const lines = value.split("\n").map((line) => line.trim());
  const first = lines[0] || "Review this block";
  if (["heading", "instruction", "paragraph"].includes(block.type))
    return { ...block, text: value.trim() || first };
  if (["short-response", "long-response"].includes(block.type))
    return { ...block, prompt: value.trim() || first };
  if (block.type === "reflection") return { ...block, title: first };
  if (block.type === "checklist")
    return { ...block, prompt: first, items: lines.slice(1).filter(Boolean) };
  if (block.type === "multiple-choice")
    return { ...block, prompt: first, options: lines.slice(1).filter(Boolean) };
  if (block.type === "sentence-completion")
    return { ...block, textBefore: first, textAfter: lines[1] ?? "" };
  if (block.type === "basic-table") {
    const rows = value
      .split("\n")
      .map((row) => row.split("\t").map((cell) => cell.trim()));
    return { ...block, headers: rows[0], rows: rows.slice(1) };
  }
  return block;
}

function asType(block, type) {
  const content = blockContent(block).split("\n")[0] || "Review this block";
  const base = { id: block.id, sortOrder: block.sortOrder, type };
  if (type === "heading") return { ...base, text: content, level: 2, alignment: "left" };
  if (["instruction", "paragraph"].includes(type))
    return { ...base, text: content, alignment: "left" };
  if (["short-response", "long-response"].includes(type))
    return {
      ...base,
      prompt: content,
      placeholder: "",
      lineCount: type === "short-response" ? 1 : 5,
    };
  return { ...base, title: content, instruction: "", lineCount: 5 };
}

export default function WorksheetConversionPanel({
  mode,
  onBack,
  onImported,
  repository,
}) {
  const [sourceText, setSourceText] = useState("");
  const [review, setReview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState(false);

  function prepareReview(text, options) {
    setReview({
      description: "",
      attribution: "",
      ...convertWorksheetText(text, options),
    });
    setSourceText(text);
    setError("");
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLocaleLowerCase().endsWith(`.${mode}`)) {
      setError(`Choose a .${mode} Worksheet file.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const extracted = await extractWorksheetFile(file, mode);
      prepareReview(extracted.text, extracted);
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setBusy(false);
    }
  }

  function updateBlock(pageIndex, blockIndex, transform) {
    setReview((current) => ({
      ...current,
      pages: current.pages.map((page, currentPage) =>
        currentPage === pageIndex
          ? {
              ...page,
              blocks: page.blocks.map((block, currentBlock) =>
                currentBlock === blockIndex ? transform(block) : block
              ),
            }
          : page
      ),
    }));
  }

  function moveBlock(pageIndex, blockIndex, direction) {
    setReview((current) => {
      const pages = structuredClone(current.pages);
      const blocks = pages[pageIndex].blocks;
      const target = blockIndex + direction;
      if (target < 0 || target >= blocks.length) return current;
      [blocks[blockIndex], blocks[target]] = [blocks[target], blocks[blockIndex]];
      return { ...current, pages };
    });
  }

  async function confirmImport() {
    setBusy(true);
    setError("");
    try {
      const pair = createWorksheetPairFromConversion(review);
      const importedPairs = await repository.importWorksheets([pair]);
      setImported(true);
      await onImported?.(importedPairs[0]);
    } catch (caughtError) {
      setError(caughtError.details?.[0]?.message ?? caughtError.message);
    } finally {
      setBusy(false);
    }
  }

  if (!review) {
    return (
      <section className="worksheet-conversion" aria-labelledby="worksheet-convert-title">
        <div>
          <h2 id="worksheet-convert-title">
            {mode === "paste" ? "Paste Worksheet Text" : `Convert ${mode.toUpperCase()}`}
          </h2>
          <p>Nothing is saved until you review, edit, and confirm the conversion.</p>
        </div>
        {mode === "paste" ? (
          <label>
            Worksheet text
            <textarea
              onChange={(event) => setSourceText(event.target.value)}
              rows={14}
              value={sourceText}
            />
          </label>
        ) : (
          <label>
            Choose {fileTypes[mode].label}
            <input
              accept={fileTypes[mode].accept}
              disabled={busy}
              onChange={handleFile}
              type="file"
            />
          </label>
        )}
        {error ? <p role="alert">{error}</p> : null}
        <div className="worksheet-actions">
          {mode === "paste" ? (
            <button
              disabled={!sourceText.trim() || busy}
              onClick={() => {
                try {
                  prepareReview(sourceText);
                } catch (caughtError) {
                  setError(caughtError.message);
                }
              }}
              type="button"
            >
              Review Conversion
            </button>
          ) : null}
          <button disabled={busy} onClick={onBack} type="button">
            Back to Import Options
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="worksheet-conversion-review"
      aria-labelledby="worksheet-review-title"
    >
      <div>
        <h2 id="worksheet-review-title">Review Conversion</h2>
        <p>
          {review.pages.length} {review.pages.length === 1 ? "page" : "pages"}. Review
          every proposed block before importing.
        </p>
      </div>
      {review.warnings.length ? (
        <div className="worksheet-conversion-warning">
          <strong>Review suggested</strong>
          <ul>
            {review.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="worksheet-conversion-fields">
        <label>
          Worksheet title
          <input
            onChange={(event) =>
              setReview((current) => ({ ...current, title: event.target.value }))
            }
            value={review.title}
          />
        </label>
        <label>
          Description
          <textarea
            onChange={(event) =>
              setReview((current) => ({ ...current, description: event.target.value }))
            }
            rows={2}
            value={review.description}
          />
        </label>
        <label>
          Source or Attribution
          <textarea
            onChange={(event) =>
              setReview((current) => ({
                ...current,
                attribution: event.target.value,
              }))
            }
            rows={2}
            value={review.attribution}
          />
        </label>
      </div>
      {review.pages.map((page, pageIndex) => (
        <section className="worksheet-conversion-page" key={`${page.title}-${pageIndex}`}>
          <label>
            Page title
            <input
              onChange={(event) =>
                setReview((current) => ({
                  ...current,
                  pages: current.pages.map((item, index) =>
                    index === pageIndex ? { ...item, title: event.target.value } : item
                  ),
                }))
              }
              value={page.title}
            />
          </label>
          {page.blocks.map((block, blockIndex) => (
            <article className="worksheet-conversion-block" key={block.id}>
              <div className="worksheet-conversion-block__header">
                <label>
                  Block type
                  <select
                    disabled={!changeableTypes.includes(block.type)}
                    onChange={(event) =>
                      updateBlock(pageIndex, blockIndex, (item) =>
                        asType(item, event.target.value)
                      )
                    }
                    value={block.type}
                  >
                    {(changeableTypes.includes(block.type)
                      ? changeableTypes
                      : [block.type]
                    ).map((type) => (
                      <option key={type} value={type}>
                        {type.replaceAll("-", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="worksheet-actions">
                  <button
                    aria-label={`Move block ${blockIndex + 1} up`}
                    disabled={blockIndex === 0}
                    onClick={() => moveBlock(pageIndex, blockIndex, -1)}
                    type="button"
                  >
                    Up
                  </button>
                  <button
                    aria-label={`Move block ${blockIndex + 1} down`}
                    disabled={blockIndex === page.blocks.length - 1}
                    onClick={() => moveBlock(pageIndex, blockIndex, 1)}
                    type="button"
                  >
                    Down
                  </button>
                  <button
                    aria-label={`Delete block ${blockIndex + 1}`}
                    onClick={() =>
                      setReview((current) => ({
                        ...current,
                        pages: current.pages.map((item, index) =>
                          index === pageIndex
                            ? {
                                ...item,
                                blocks: item.blocks.filter(
                                  (_, currentBlock) => currentBlock !== blockIndex
                                ),
                              }
                            : item
                        ),
                      }))
                    }
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <label>
                Extracted content
                <textarea
                  onChange={(event) =>
                    updateBlock(pageIndex, blockIndex, (item) =>
                      withContent(item, event.target.value)
                    )
                  }
                  rows={Math.min(Math.max(blockContent(block).split("\n").length, 2), 8)}
                  value={blockContent(block)}
                />
              </label>
            </article>
          ))}
        </section>
      ))}
      {error ? <p role="alert">{error}</p> : null}
      {imported ? <p role="status">Worksheet imported successfully.</p> : null}
      <div className="worksheet-actions">
        <button disabled={busy || imported} onClick={confirmImport} type="button">
          {busy ? "Importing…" : imported ? "Imported" : "Confirm Import"}
        </button>
        <button disabled={busy} onClick={() => setReview(null)} type="button">
          Back to Source
        </button>
        <button disabled={busy} onClick={onBack} type="button">
          Cancel
        </button>
      </div>
    </section>
  );
}
