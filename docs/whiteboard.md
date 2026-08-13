# Therapy Studio Whiteboard

The Whiteboard is a child-safe telehealth tool at `/whiteboard`. Its workspace-first UI
supports freehand drawing, erasing, editable text, rectangles, ellipses, straight arrows,
and curated visuals. Objects can be selected, moved, resized, styled, deleted, undone,
redone, and saved through the existing local save/open/new workflow. A lightweight pan
tool and corner zoom controls change only the current view.

Whiteboard documents are validated independently and stored in the additive
`whiteboardDocuments` table. They store semantic icon IDs rather than SVG markup and do
not contain Resource Memory or therapist-private fields. Therapy Studio backups include
saved Whiteboards.

Same-origin browser tabs can exchange the active document through BroadcastChannel.
This is intended for local testing or two-tab presentation only; remote internet
collaboration, permissions, conflict resolution, sticky notes, connector routing,
rotation, grouping, layers, and advanced typography are deferred. Existing version 1
Whiteboards containing only strokes, text, and visuals remain valid; the additional
shape and arrow object variants require no database migration.

## Session Canvas Templates

The Whiteboard offers three original, validated quick starts: Feelings Thermometer,
Blank Shield, and Blank Canvas. A Session Canvas Template is a read-only master made
from the same object types as a Whiteboard document. Choosing **Use Now** creates an
independent version 1 Whiteboard with a fresh document ID and fresh object IDs; it does
not write to storage or mutate the master. The copy can immediately use the normal
drawing, text, shape, arrow, visual, movement, resize, undo, and redo tools. Choosing
**Save** persists that copy through the existing Whiteboard repository with no client
identifier or therapist-private data.

This establishes a deliberately small future boundary: Worksheets, Canvas Templates,
and blank Whiteboards may all open into a session canvas, while their source documents
and persistence remain separate. Template authoring/import, Universal Search exposure,
Worksheet embedding, and remote child-device collaboration are deferred.

## Local Live Session Foundation

**Invite Child** currently creates a local-development participant URL for same-origin,
two-tab testing only. It does not provide cross-device or internet collaboration and does
not authenticate a therapist or child. The child route is isolated from the regular
Therapy Studio shell and exposes no local saved-board, Resource Memory, library, Settings,
or backup controls.

The Whiteboard Live Session adapter shares a validated allowlist: strokes, text, shapes,
arrows, curated SVG semantic IDs, and their normal geometry. It never shares imported
PDF/image media, `localMediaAssets` IDs, binary content, filesystem paths, Save/Open/New
state, local selection, undo/redo history, active tools, zoom/pan, or therapist data.
If a host board contains a local imported image, it remains local and a warning explains
that it is not sent to the participant.

Phase 1B will replace the local transport with an authenticated internet room transport.
That milestone must establish therapist authentication, short-lived participant join
tokens, host authority, server-side expiry, and secure cross-device media policy before
it can be described as production collaboration.

## Activity Import

**Add Activity** accepts local PDF, JPEG, PNG, and WebP files without uploading them.
For PDFs, the therapist chooses a page when the document has more than one. **Open as
Activity** renders that page or image into the canvas, fits and centers it, locks it
behind all marks, and activates Draw. **Insert as Object** instead creates a movable,
proportionally resizable image that can later be set as the background.

Imported media is stored in the shared `localMediaAssets` table and referenced by a
stable `assetId`; Whiteboard documents never contain filesystem paths, temporary object
URLs, raw binary data, or base64. Saved media participates in local backup and restore.
The background can be deliberately unlocked and relocked. **Reset Marks** removes
annotations while preserving the activity background. Remote file storage, OCR, PDF
management, and child-device networking remain deferred.
