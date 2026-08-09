import { Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { worksheetRepository } from "../../lib/data";
import { EmptyState, Page } from "../../components/layout";
import { Button } from "../../components/ui";
import NewWorksheetDialog from "./NewWorksheetDialog";
import WorksheetCard from "./WorksheetCard";
import "./WorksheetsPage.css";

export default function WorksheetsPage({ repository = worksheetRepository }) {
  const navigate = useNavigate();
  const [worksheets, setWorksheets] = useState([]);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const readWorksheets = useCallback(
    () => repository.getAllWorksheets({ includeArchived: showArchived }),
    [repository, showArchived]
  );

  useEffect(() => {
    let active = true;
    readWorksheets()
      .then((results) => {
        if (active) {
          setWorksheets(results);
          setError("");
        }
      })
      .catch((caughtError) => {
        if (active) setError(caughtError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [readWorksheets]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return worksheets;
    return worksheets.filter((worksheet) =>
      [
        worksheet.title,
        worksheet.description,
        worksheet.category,
        ...worksheet.tags,
        ...worksheet.goals,
        ...worksheet.diagnoses,
        ...worksheet.ageRanges,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalized)
    );
  }, [query, worksheets]);

  async function toggleArchive(worksheet) {
    setLoading(true);
    if (worksheet.archived) await repository.restoreWorksheet(worksheet.id);
    else await repository.archiveWorksheet(worksheet.id);
    setWorksheets(await readWorksheets());
    setLoading(false);
  }

  async function duplicateWorksheet(worksheet) {
    setLoading(true);
    try {
      const created = await repository.duplicateWorksheet(worksheet.id);
      navigate(`/worksheets/${created.resource.id}/build`);
    } catch (caughtError) {
      setError(caughtError.message);
      setLoading(false);
    }
  }

  return (
    <Page
      actions={
        !creating ? (
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" size={18} />
            New Worksheet
          </Button>
        ) : null
      }
      className="worksheets-page"
      description="Start with a ready-to-use Therapy Studio original, or create your own editable material."
      title="Worksheets"
    >
      {creating ? (
        <NewWorksheetDialog
          onCancel={() => setCreating(false)}
          onCreate={async (input) => {
            const created = await repository.createWorksheet(input);
            navigate(`/worksheets/${created.resource.id}/build`);
          }}
        />
      ) : null}

      <div className="worksheet-toolbar">
        <label>
          <Search aria-hidden="true" size={17} />
          <span className="sr-only">Search Worksheets</span>
          <input
            className="studio-control"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Worksheets"
            type="search"
            value={query}
          />
        </label>
        <label>
          <input
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
            type="checkbox"
          />
          Show Archived
        </label>
      </div>

      {loading ? <p role="status">Loading Worksheets…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {!loading && !error && visible.length ? (
        <div className="worksheet-grid">
          {visible.map((worksheet) => (
            <WorksheetCard
              key={worksheet.id}
              onArchive={toggleArchive}
              onDuplicate={duplicateWorksheet}
              worksheet={worksheet}
            />
          ))}
        </div>
      ) : null}
      {!loading && !error && !visible.length ? (
        <EmptyState
          description={
            query ? "Try another search." : "Create your first original Worksheet."
          }
          title="No Worksheets Found"
        />
      ) : null}
    </Page>
  );
}
