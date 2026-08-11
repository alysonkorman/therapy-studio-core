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
