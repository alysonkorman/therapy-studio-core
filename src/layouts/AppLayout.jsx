import {
  Brain,
  FileText,
  Gamepad2,
  Heart,
  Home,
  MessageCircle,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import "../App.css";

const navigationItems = [
  { label: "Home", path: "/", icon: Home },
  { label: "Prompts", path: "/prompts", icon: MessageCircle },
  { label: "Interventions", path: "/interventions", icon: Brain },
  { label: "Games", path: "/games", icon: Gamepad2 },
  { label: "Worksheets", path: "/worksheets", icon: FileText },
  { label: "Session Profiles", path: "/clients", icon: Users },
  { label: "Saved", path: "/saved", icon: Heart },
];

export default function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/">
          <div className="brand-icon">
            <Sparkles size={22} />
          </div>

          <div>
            <strong>Therapy Studio</strong>
            <span>Clinical workspace</span>
          </div>
        </NavLink>

        <nav className="sidebar-navigation" aria-label="Main navigation">
          {navigationItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              className={({ isActive }) =>
                `navigation-button ${isActive ? "active" : ""}`
              }
              end={path === "/"}
              key={path}
              to={path}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <NavLink
          className={({ isActive }) =>
            `navigation-button settings-button ${isActive ? "active" : ""}`
          }
          to="/settings"
        >
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
