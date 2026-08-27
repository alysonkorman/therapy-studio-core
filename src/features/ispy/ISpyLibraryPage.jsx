import { Plus, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Page } from "../../components/layout";
import { createISpyBoard, listISpyBoards, saveISpyBoard } from "./iSpyStore";
export default function ISpyLibraryPage() {
  const [boards, setBoards] = useState([]);
  const navigate = useNavigate();
  const refresh = () => listISpyBoards().then(setBoards);
  useEffect(() => {
    refresh();
  }, []);
  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const asset = { name: file.name, type: file.type, url: URL.createObjectURL(file) };
    const board = await saveISpyBoard(
      createISpyBoard({ asset, title: file.name.replace(/\.[^.]+$/, "") })
    );
    navigate(`/activities/i-spy/${board.id}/edit`);
  };
  return (
    <Page
      title="I Spy"
      description="Import a board and use it right away, or make it interactive later."
    >
      <label className="studio-button studio-button--primary">
        <Upload size={17} /> Import Board
        <input accept="image/*,.pdf" hidden onChange={upload} type="file" />
      </label>
      <Link
        className="studio-button studio-button--secondary"
        to="/activities/i-spy/new/edit"
      >
        <Plus size={17} /> New I Spy
      </Link>
      <div className="activities-grid">
        {boards.map((b) => (
          <Link className="activity-card" key={b.id} to={`/activities/i-spy/${b.id}`}>
            <h2>{b.title}</h2>
            <small>
              {b.targets.length} targets · {b.sourceType}
            </small>
          </Link>
        ))}
      </div>
    </Page>
  );
}
