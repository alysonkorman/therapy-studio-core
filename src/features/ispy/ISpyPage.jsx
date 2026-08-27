import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getTherapyStudioDatabase } from "../../lib/data/database";
import { Page } from "../../components/layout";
import { createISpyGame, hitTarget } from "./iSpyGame";
export default function ISpyPage() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [game, setGame] = useState(null);
  useEffect(() => {
    getTherapyStudioDatabase()
      .table("iSpyBoards")
      .get(boardId)
      .then((b) => {
        setBoard(b);
        setGame(b && createISpyGame(b));
      });
  }, [boardId]);
  if (!board) return <Page title="I Spy">Loading…</Page>;
  const current = game?.clueOrder[game.index];
  const click = (e) => {
    const r = e.currentTarget.getBoundingClientRect(),
      x = ((e.clientX - r.left) / r.width) * 100,
      y = ((e.clientY - r.top) / r.height) * 100,
      t = board.targets.find((t) => hitTarget(t.region, x, y));
    if (t && t.id === current?.targetId)
      setGame({ ...game, index: game.index + 1, feedback: "correct" });
    else setGame({ ...game, feedback: "incorrect" });
  };
  return (
    <Page title={board.title} description={current ? current.clue : "All found!"}>
      <p>
        Found {game.index} of {game.clueOrder.length}
      </p>
      <div onClick={click} role="application" style={{ position: "relative" }}>
        <img alt="I Spy board" src={board.asset?.url} />
      </div>
    </Page>
  );
}
