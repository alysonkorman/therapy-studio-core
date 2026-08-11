import { Menu, Search, Sparkles, X } from "lucide-react";
import { useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import "../App.css";
import { getNavigationItemForPath, navigationItems } from "../app/navigation";

export default function AppLayout() {
  const { pathname } = useLocation();
  const [mobileMenuPath, setMobileMenuPath] = useState(null);
  const navigationRef = useRef(null);
  const navigationToggleRef = useRef(null);
  const mobileMenuOpen = mobileMenuPath === pathname;
  const currentPageLabel = getNavigationItemForPath(pathname)?.label ?? "Therapy Studio";

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
    <div className="app-shell" onKeyDown={handleShellKeyDown}>
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

        <main className="main-content" id="main-content" tabIndex="-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
