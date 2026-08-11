import { Brain, FileText, Gamepad2, Heart, MessageCircle, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Page, Section } from "../../components/layout";
import { resourceMemoryRepository } from "../../lib/data";
import DashboardRecentResources from "./DashboardRecentResources";
import ResourceSearch from "../search/ResourceSearch";
import CurrentSessionCard from "../sessions/CurrentSessionCard";

const toolShortcuts = [
  {
    title: "Prompts",
    path: "/prompts",
    description: "Open a question or conversation deck.",
    icon: MessageCircle,
  },
  {
    title: "Interventions",
    path: "/interventions",
    description: "Browse clinical activities and materials.",
    icon: Brain,
  },
  {
    title: "Worksheets",
    path: "/worksheets",
    description: "Create, reopen, or share a worksheet.",
    icon: FileText,
  },
  {
    title: "Games",
    path: "/games",
    description: "Play a calm, screen-share-friendly Trivia game.",
    icon: Gamepad2,
  },
  {
    title: "Session Profiles",
    path: "/clients",
    description: "Load useful, non-identifying session context.",
    icon: Users,
  },
  {
    title: "Saved",
    path: "/saved",
    description: "Return to favorites and remembered Resources.",
    icon: Heart,
  },
];

function ToolShortcut({ title, description, icon: Icon, path, status }) {
  return (
    <Link aria-label={`Open ${title}`} className="dashboard-shortcut" to={path}>
      <span className="dashboard-shortcut__icon">
        <Icon aria-hidden="true" size={21} />
      </span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
        {status ? <em>{status}</em> : null}
      </span>
    </Link>
  );
}

export default function DashboardPage({ memoryRepository = resourceMemoryRepository }) {
  return (
    <Page
      className="dashboard-page"
      description="Find something clinically meaningful for this child and this moment."
      title="What would help this child engage today?"
    >
      <ResourceSearch />

      <Section
        actions={
          <Link className="studio-button studio-button--secondary" to="/saved">
            View Saved
          </Link>
        }
        description="Quickly reopen something that was intentionally used."
        title="Continue Where You Left Off"
      >
        <DashboardRecentResources repository={memoryRepository} />
      </Section>

      <Section
        description="Go straight to the part of Therapy Studio you need."
        title="Session Tools"
      >
        <div className="dashboard-shortcut-grid">
          {toolShortcuts.map((tool) => (
            <ToolShortcut key={tool.title} {...tool} />
          ))}
        </div>
      </Section>

      <Section
        description="Optional, temporary context can make search results more useful."
        title="Current Session Context"
      >
        <CurrentSessionCard />
      </Section>
    </Page>
  );
}
