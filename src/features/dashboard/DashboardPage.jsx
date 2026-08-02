import {
  BookOpen,
  Boxes,
  Brain,
  Dice5,
  FileText,
  Gamepad2,
  Library,
  MessageCircle,
  Search,
  Shapes,
  UserRound,
  Users,
  WandSparkles,
} from "lucide-react";

const toolCards = [
  {
    title: "Prompts",
    description: "Questions, directives, activities, and conversation starters.",
    icon: MessageCircle,
  },
  {
    title: "Interventions",
    description: "Clinical activities connected to sources, research, and materials.",
    icon: Brain,
  },
  {
    title: "Games",
    description: "Interactive and two-player activities designed for telehealth.",
    icon: Gamepad2,
  },
  {
    title: "Worksheets",
    description: "Create, customize, complete, and export therapeutic worksheets.",
    icon: FileText,
  },
  {
    title: "Whiteboard",
    description: "Draw, write, brainstorm, and build ideas together in real time.",
    icon: Shapes,
  },
  {
    title: "Scene Builder",
    description: "Build expressive scenes with movable people, objects, and settings.",
    icon: Boxes,
  },
  {
    title: "Workbooks",
    description: "Combine worksheets and psychoeducation into reusable packets.",
    icon: BookOpen,
  },
  {
    title: "Session Randomizer",
    description: "Generate a flexible session plan from the current session details.",
    icon: Dice5,
  },
];

function SearchBar() {
  return (
    <section className="search-section">
      <label className="search-label" htmlFor="therapy-search">
        What do you need right now?
      </label>

      <div className="search-field">
        <Search size={22} />
        <input
          id="therapy-search"
          placeholder="Try: 9 year old with ADHD who will not talk today"
          type="search"
        />
        <button type="button">Search</button>
      </div>

      <div className="suggested-searches">
        <span>Try:</span>
        <button type="button">shutting down</button>
        <button type="button">Pokémon</button>
        <button type="button">rapport</button>
        <button type="button">10 minutes left</button>
        <button type="button">telehealth</button>
      </div>
    </section>
  );
}

function CurrentSessionCard() {
  return (
    <section className="session-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Optional context</span>
          <h2>Current Session</h2>
        </div>
        <div className="session-icon">
          <UserRound size={22} />
        </div>
      </div>

      <p>
        Add only what is useful right now. Therapy Studio can use it to improve search
        results and recommendations.
      </p>

      <div className="session-fields">
        <label>
          Age
          <select defaultValue="">
            <option disabled value="">
              Select
            </option>
            <option>5–7</option>
            <option>8–10</option>
            <option>11–13</option>
            <option>14–17</option>
          </select>
        </label>
        <label>
          Session length
          <select defaultValue="45 minutes">
            <option>15 minutes</option>
            <option>30 minutes</option>
            <option>45 minutes</option>
            <option>60 minutes</option>
          </select>
        </label>
        <label className="wide-field">
          What is happening?
          <input placeholder="Shutting down, restless, anxious..." type="text" />
        </label>
        <label className="wide-field">
          Interests
          <input placeholder="Pokémon, drawing, animals..." type="text" />
        </label>
      </div>

      <button className="advanced-button" type="button">
        Show advanced options
      </button>
    </section>
  );
}

function ToolCard({ title, description, icon: Icon }) {
  return (
    <button className="tool-card" type="button">
      <div className="tool-card-icon">
        <Icon size={26} />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <WandSparkles className="tool-card-arrow" size={18} />
    </button>
  );
}

export default function DashboardPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Your telehealth therapy workspace</span>
          <h1>What would help this kid engage today?</h1>
        </div>
        <button className="session-mode-button" type="button">
          <Users size={19} />
          Start session mode
        </button>
      </header>

      <SearchBar />

      <div className="home-layout">
        <CurrentSessionCard />
        <section className="quick-action-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Quick help</span>
              <h2>I need an idea</h2>
            </div>
            <div className="randomizer-icon">
              <Dice5 size={22} />
            </div>
          </div>
          <p>
            Use the current-session details to generate several flexible, clinically
            meaningful options.
          </p>
          <button className="primary-button" type="button">
            <Dice5 size={19} />
            Randomize a session
          </button>
        </section>
      </div>

      <section className="tools-section">
        <div className="tools-heading">
          <div>
            <span className="eyebrow">Everything stays connected</span>
            <h2>Browse Therapy Studio</h2>
          </div>
          <button className="browse-button" type="button">
            <Library size={18} />
            Browse all resources
          </button>
        </div>
        <div className="tool-grid">
          {toolCards.map((tool) => (
            <ToolCard key={tool.title} {...tool} />
          ))}
        </div>
      </section>
    </>
  );
}
