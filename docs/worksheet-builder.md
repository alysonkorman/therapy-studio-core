# Worksheet Builder

Worksheet Builder creates original, therapist-authored Worksheets inside Therapy
Studio. It is intentionally separate from imported-file conversion,
psychoeducation, workbooks, AI, cloud storage, and collaboration.

## Routes

- `/worksheets` — searchable Worksheet Library with creation and archive controls.
- `/worksheets/:worksheetId` — Worksheet overview and actions.
- `/worksheets/:worksheetId/build` — editable page-and-block builder.
- `/worksheets/:worksheetId/preview` — print preview and browser Print/PDF action.
- `/worksheets/:worksheetId/session` — distraction-reduced session presentation.

## Data Model

Each Worksheet has two linked records: a shared Resource with `type: "worksheet"` for
common identity and metadata, and a versioned Worksheet Document keyed by that Resource
ID for ordered pages, page settings, and ordered blocks.

The first document version supports headings, instructions, paragraphs, short and long
responses, checklists, multiple choice, rating scales, feelings scales, drawing areas,
dividers, and spacers. All authored text is plain text; HTML is rejected. Image blocks
are deferred.

## Persistence and Saving

`worksheetRepository.js` is the sole persistence boundary. Worksheet creation writes
the Resource and first document atomically. Saving validates the complete document,
writes it, and updates the Resource timestamp in one transaction. The Builder uses an
explicit Save action. A failed save keeps the local draft and offers Retry.

The database adds `worksheetDocuments`, keyed by `worksheetId`. Resource deletion and
archive operations remain explicit repository actions.

## Preview, Printing, and Session Use

Preview and session routes use the same document renderer as the Builder canvas.
Print-specific styles remove application controls and format each Worksheet page for
browser printing or Save as PDF. Opening the session route records one meaningful use;
browsing, editing, and previewing do not.

## Current Limitations

- No image block or uploaded-file storage.
- No imported PDF/image conversion or OCR.
- No collaboration, cloud sync, AI generation, psychoeducation, or workbook features.
- Browser print output may vary slightly by browser and printer settings.
