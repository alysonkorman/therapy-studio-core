import {
  Brain,
  FileText,
  Gamepad2,
  Heart,
  Home,
  MessageCircle,
  Settings,
  Users,
} from "lucide-react";

export const navigationItems = Object.freeze([
  { label: "Home", path: "/", icon: Home },
  { label: "Prompts", path: "/prompts", icon: MessageCircle },
  { label: "Interventions", path: "/interventions", icon: Brain },
  { label: "Games", path: "/games", icon: Gamepad2 },
  { label: "Worksheets", path: "/worksheets", icon: FileText },
  { label: "Session Profiles", path: "/clients", icon: Users },
  { label: "Saved", path: "/saved", icon: Heart },
  { label: "Settings", path: "/settings", icon: Settings, utility: true },
]);

export function getNavigationItemForPath(pathname) {
  return navigationItems.find(({ path }) =>
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`)
  );
}
