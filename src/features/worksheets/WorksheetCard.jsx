import { Link } from "react-router-dom";

import ResourceCard from "../../components/ResourceCard";
import { isTherapistWorksheetTemplate } from "../../models";

export default function WorksheetCard({
  onArchive,
  onDelete,
  onDuplicate,
  onRenameTemplate,
  onSaveAsTemplate,
  onUseTemplate,
  worksheet,
}) {
  const starter = worksheet.provenance === "therapy-studio-starter";
  const template = isTherapistWorksheetTemplate(worksheet);
  return (
    <div className="worksheet-library-card">
      {starter ? (
        <span className="worksheet-starter-badge">Therapy Studio Original</span>
      ) : template ? (
        <span className="worksheet-template-badge">My Template</span>
      ) : null}
      <ResourceCard resource={worksheet} />
      <div className="worksheet-actions">
        {!template ? <Link to={`/worksheets/${worksheet.id}`}>Open</Link> : null}
        {template ? (
          <>
            <button onClick={() => onUseTemplate(worksheet)} type="button">
              Use Template
            </button>
            <button onClick={() => onRenameTemplate(worksheet)} type="button">
              Rename
            </button>
          </>
        ) : starter ? (
          <button onClick={() => onDuplicate(worksheet)} type="button">
            Duplicate to Edit
          </button>
        ) : (
          <Link to={`/worksheets/${worksheet.id}/build`}>Build/Edit</Link>
        )}
        <Link to={`/worksheets/${worksheet.id}/preview`}>Preview</Link>
        {!starter && !template ? (
          <button onClick={() => onSaveAsTemplate(worksheet)} type="button">
            Save as Template
          </button>
        ) : null}
        {!starter && !template ? (
          <button onClick={() => onArchive(worksheet)} type="button">
            {worksheet.archived ? "Restore" : "Archive"}
          </button>
        ) : template ? (
          <button
            className="worksheet-template-delete-action"
            onClick={() => onDelete(worksheet)}
            type="button"
          >
            Delete Template
          </button>
        ) : null}
      </div>
    </div>
  );
}
