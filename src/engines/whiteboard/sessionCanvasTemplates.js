import { whiteboardDocumentSchema } from "../../models/whiteboard";
import { sessionCanvasTemplateSchema } from "../../models/sessionCanvasTemplate";

function copy(value) {
  return structuredClone(value);
}

export function instantiateSessionCanvasTemplate(
  templateInput,
  { createId, now = new Date().toISOString() }
) {
  const template = sessionCanvasTemplateSchema.parse(templateInput);
  return whiteboardDocumentSchema.parse({
    id: createId(),
    documentVersion: 1,
    title: `${template.title} — Session Copy`,
    objects: template.objects.map((object) => ({ ...copy(object), id: createId() })),
    createdAt: now,
    updatedAt: now,
  });
}
