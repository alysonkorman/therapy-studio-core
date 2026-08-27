import {
  Brain,
  Compass,
  FileText,
  Heart,
  Home,
  MessageCircle,
  Settings,
  Users,
} from "lucide-react";

export function createNavigationItems() {
  return Object.freeze([
    { label: "Home", path: "/", icon: Home },
    { label: "Prompts", path: "/prompts", icon: MessageCircle },
    { label: "Interventions", path: "/interventions", icon: Brain },
    { label: "Activities", path: "/activities", icon: Compass },
    { label: "Worksheets", path: "/worksheets", icon: FileText },
    { label: "Session Profiles", path: "/clients", icon: Users },
    { label: "Saved", path: "/saved", icon: Heart },
    { label: "Settings", path: "/settings", icon: Settings, utility: true },
  ]);
}

export const navigationItems = createNavigationItems();

export function getNavigationItemForPath(pathname) {
  return createNavigationItems().find(({ path }) =>
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`)
  );
}
