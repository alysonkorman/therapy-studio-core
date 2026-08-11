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

The Builder exposes the practical settings already defined by that model: heading
level and alignment, text alignment, response-line count, drawing height, checklist
Other choices, single or multiple selection, rating bounds and number visibility,
divider style, and spacer size. A selected block is clearly marked and provides nearby
keyboard-accessible move, duplicate, and delete actions. Drag-and-drop ordering remains
deferred; Move Up and Move Down are the dependable ordering controls.

## Persistence and Saving

`worksheetRepository.js` is the sole persistence boundary. Worksheet creation writes
the Resource and first document atomically. Saving validates the complete document,
writes it, and updates the Resource timestamp in one transaction. The Builder uses an
explicit Save action. A failed save keeps the local draft and offers Retry.

The database adds `worksheetDocuments`, keyed by `worksheetId`. Resource deletion and
archive operations remain explicit repository actions.

## Structured JSON Import

The Worksheet Library accepts version 1 `therapy-studio-worksheets` JSON files containing
one or more existing Worksheet Resource/document pairs. The complete file is validated
before one atomic repository transaction. Duplicate IDs, protected starter IDs, existing
Resource conflicts, malformed pairs, and mismatched Resource/document IDs are rejected
without partial writes. Imported Worksheets behave like therapist-created Worksheets.

Backup & Restore is not Worksheet import. Future converters for older Toolkit records,
PDFs, or documents should produce this validated JSON envelope after therapist review.
PDF/image parsing, OCR, arbitrary file interpretation, and automatic conversion remain
separate future work.

## Preview, Printing, and Session Use

Preview and session routes use the same document renderer as the Builder canvas.
Print-specific styles remove application controls and format each Worksheet page for
browser printing or Save as PDF. Session responses live in temporary page state and
never update the reusable source Worksheet. A therapist may reset them, print them, or
save a separate `— Completed Copy` Resource/document pair containing a validated response
map. Leaving with unsaved changes requires confirmation. Opening the session route records
one meaningful use; browsing, editing, and previewing do not.

The first interactive session pass supports text responses, checklists, multiple choice,
rating scales, reflections, sentence completion, CBT thought checks, coping plans, and
table cells. Static instructional and visual blocks remain display-only. Drawing Area
interaction is deferred because embedding the full Whiteboard would exceed this focused
session milestone.

The intended telehealth workflow is browser/window screen sharing through Zoom or another
platform; Therapy Studio does not connect to Zoom. A future child-on-own-device mode will
require authenticated temporary links and network/backend synchronization. Same-browser
`BroadcastChannel` messaging is not a substitute for that remote collaboration boundary.

## Current Limitations

- No image block or uploaded-file storage.
- No imported PDF/image conversion or OCR.
- No collaboration, cloud sync, AI generation, psychoeducation, or workbook features.
- Browser print output may vary slightly by browser and printer settings.
