import { Link } from "react-router-dom";

import ResourceCard from "../../components/ResourceCard";

export default function WorksheetCard({ onArchive, onDuplicate, worksheet }) {
  const starter = worksheet.provenance === "therapy-studio-starter";
  return (
    <div className="worksheet-library-card">
      {starter ? (
        <span className="worksheet-starter-badge">Therapy Studio Original</span>
      ) : null}
      <ResourceCard resource={worksheet} />
      <div className="worksheet-actions">
        <Link to={`/worksheets/${worksheet.id}`}>Open</Link>
        {starter ? (
          <button onClick={() => onDuplicate(worksheet)} type="button">
            Duplicate to Edit
          </button>
        ) : (
          <Link to={`/worksheets/${worksheet.id}/build`}>Build/Edit</Link>
        )}
        <Link to={`/worksheets/${worksheet.id}/preview`}>Preview</Link>
        {!starter ? (
          <button onClick={() => onArchive(worksheet)} type="button">
            {worksheet.archived ? "Restore" : "Archive"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
