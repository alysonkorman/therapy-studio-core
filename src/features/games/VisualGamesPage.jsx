import { ArrowLeft, CircleDot, Palette, Search, Waypoints } from "lucide-react";
import { Link } from "react-router-dom";

import { Page } from "../../components/layout";
import "./GamesPage.css";

const assets = import.meta.glob("../../assets/visual-games/*", { eager: true, import: "default", query: "?url" });
const titleFor = (path) => path.split("/").pop().replace(/^vecteezy_/, "").replace(/_[0-9]+(?:-[0-9]+)?\.jpg$/, "").replaceAll("-", " ");
function kindFor(path) { if (/color-by-number/.test(path)) return "Color by Number"; if (/dot-to-dot/.test(path)) return "Connect the Dots"; if (/difference/.test(path)) return "Find the Difference"; return "Find It"; }
const details = { "Find It": { icon: Search, hint: "Circle each thing you find." }, "Connect the Dots": { icon: Waypoints, hint: "Draw a path from dot to dot." }, "Color by Number": { icon: Palette, hint: "Choose a color, then fill the numbered spaces." }, "Find the Difference": { icon: CircleDot, hint: "Circle every difference you spot." } };

export default function VisualGamesPage() {
  const games = Object.entries(assets).filter(([path]) => !/board-game|game-board/.test(path)).map(([path, image]) => ({ id: path.split("/").pop(), image, title: titleFor(path), kind: kindFor(path) })).sort((a, b) => a.title.localeCompare(b.title));
  const groups = Object.keys(details).map((kind) => [kind, games.filter((game) => game.kind === kind)]).filter(([, items]) => items.length);
  return <Page actions={<Link className="studio-button studio-button--secondary" to="/games"><ArrowLeft size={17} /> Back to Games</Link>} className="visual-games-page" description="Choose a licensed activity, then play directly on the page." title="Visual Activities"><div className="visual-games-groups">{groups.map(([kind, items]) => { const Icon = details[kind].icon; return <section key={kind}><header className="visual-games-group__header"><Icon aria-hidden="true" size={22} /><div><h2>{kind}</h2><p>{details[kind].hint}</p></div></header><div className="visual-games-grid">{items.map((game) => <article className="visual-game-card" key={game.image}><img alt="" loading="lazy" src={game.image} /><div><span className="resource-type-badge">{game.kind}</span><h3>{game.title}</h3><p>{details[game.kind].hint}</p><Link className="studio-button studio-button--secondary" to={`/games/visual/${encodeURIComponent(game.id)}`}><Icon size={17} /> Open activity</Link></div></article>)}</div></section>; })}</div></Page>;
}
