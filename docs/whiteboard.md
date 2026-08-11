# Therapy Studio Whiteboard

The Whiteboard is a child-safe telehealth tool at `/whiteboard`. It supports freehand
drawing, erasing, plain text, curated SVG visuals, selection and movement, SVG resizing,
undo/redo, clearing, and local save/open/new workflows.

Whiteboard documents are validated independently and stored in the additive
`whiteboardDocuments` table. They store semantic icon IDs rather than SVG markup and do
not contain Resource Memory or therapist-private fields. Therapy Studio backups include
saved Whiteboards.

Same-origin browser tabs can exchange the active document through BroadcastChannel.
This is intended for local testing or two-tab presentation only; remote internet
collaboration, permissions, conflict resolution, shapes, sticky notes, connectors,
layers, and advanced typography are deferred.
