import { Menu, Search, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import "../App.css";
import { createNavigationItems, getNavigationItemForPath } from "../app/navigation";
import {
  captureCognitoHostToken,
  hasPendingLiveSessionInvite,
} from "../features/live-sessions/liveSessionHostAuth";
import { SharedSessionProvider } from "../features/live-sessions/SharedSessionProvider";
import SharedSessionBar from "../features/live-sessions/SharedSessionBar";

const backgroundArtwork = Object.values(
  import.meta.glob("../assets/page-backgrounds/*", {
    eager: true,
    import: "default",
    query: "?url",
  })
).sort();

function artworkFor(pathname) {
  if (!backgroundArtwork.length) return undefined;
  const day = Math.floor(Date.now() / 86_400_000);
  const index = [...`${pathname}-${day}`].reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  );
  return backgroundArtwork[index % backgroundArtwork.length];
}

export default function AppLayout({ enableWorkspaceLab = import.meta.env.DEV }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileMenuPath, setMobileMenuPath] = useState(null);
  const navigationRef = useRef(null);
  const navigationToggleRef = useRef(null);
  const mobileMenuOpen = mobileMenuPath === pathname;
  const navigationItems = createNavigationItems({ enableWorkspaceLab });
  const currentPageLabel =
    getNavigationItemForPath(pathname, { enableWorkspaceLab })?.label ?? "Therapy Studio";
  const pageArtwork = artworkFor(pathname);

  useEffect(() => {
    const token = captureCognitoHostToken();
    if (token && hasPendingLiveSessionInvite() && pathname !== "/whiteboard")
      navigate("/whiteboard", { replace: true });
  }, [navigate, pathname]);

  function closeMobileMenu() {
    setMobileMenuPath(null);
  }

  function handleShellKeyDown(event) {
    if (event.key === "Escape" && mobileMenuOpen) {
      closeMobileMenu();
      navigationToggleRef.current?.focus();
    }
  }

  function focusMainContent() {
    document.getElementById("main-content")?.focus();
  }

  function toggleMobileMenu() {
    if (mobileMenuOpen) {
      closeMobileMenu();
      return;
    }

    setMobileMenuPath(pathname);
    requestAnimationFrame(() =>
      navigationRef.current?.querySelector(".navigation-button")?.focus()
    );
  }

  return (
    <SharedSessionProvider>
      <div
        className="app-shell"
        onKeyDown={handleShellKeyDown}
        style={{ "--workspace-art": `url("${pageArtwork}")` }}
      >
        <a className="skip-to-content" href="#main-content" onClick={focusMainContent}>
          Skip to Content
        </a>

        <aside
          className={`sidebar ${mobileMenuOpen ? "sidebar--open" : ""}`}
          id="app-navigation"
          ref={navigationRef}
        >
          <NavLink className="brand" onClick={closeMobileMenu} to="/">
            <div className="brand-icon">
              <Sparkles aria-hidden="true" size={22} />
            </div>

            <div>
              <strong>Therapy Studio</strong>
              <span>Clinical workspace</span>
            </div>
          </NavLink>

          <nav className="sidebar-navigation" aria-label="Main navigation">
            {navigationItems.map(({ badge, label, path, icon: Icon, utility }) => (
              <NavLink
                className={({ isActive }) =>
                  [
                    "navigation-button",
                    utility ? "navigation-button--utility" : "",
                    isActive ? "active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
                end={path === "/"}
                key={path}
                onClick={closeMobileMenu}
                to={path}
              >
                <Icon aria-hidden="true" size={20} />
                <span>{label}</span>
                {badge ? (
                  <span aria-hidden="true" className="navigation-badge">
                    {badge}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>
        </aside>

        {mobileMenuOpen ? (
          <button
            aria-label="Dismiss Navigation Menu"
            className="navigation-backdrop"
            onClick={() => {
              closeMobileMenu();
              navigationToggleRef.current?.focus();
            }}
            type="button"
          />
        ) : null}

        <div className="shell-workspace">
          <header className="shell-toolbar">
            <button
              aria-controls="app-navigation"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close Navigation" : "Open Navigation"}
              className="mobile-navigation-toggle"
              onClick={toggleMobileMenu}
              ref={navigationToggleRef}
              type="button"
            >
              {mobileMenuOpen ? (
                <X aria-hidden="true" size={21} />
              ) : (
                <Menu aria-hidden="true" size={21} />
              )}
            </button>

            <p aria-live="polite" className="shell-current-page">
              <span>Current Page</span>
              <strong>{currentPageLabel}</strong>
            </p>

            <Link className="shell-search-link" to="/#universal-search">
              <Search aria-hidden="true" size={18} />
              Search Resources
            </Link>
          </header>
          <SharedSessionBar />

          <main className="main-content" id="main-content" tabIndex="-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SharedSessionProvider>
  );
}
