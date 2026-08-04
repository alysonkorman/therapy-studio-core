import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import IconGrid from "./IconGrid";
import IconPreview from "./IconPreview";
import IconSearch from "./IconSearch";
import IconSidebar from "./IconSidebar";
import { useIconBrowser } from "./useIconBrowser";
import "./IconBrowser.css";

export default function IconBrowser({ label, onClose, onConfirm, value }) {
  const browser = useIconBrowser(value);
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.focus();
    function closeOnEscape(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function confirm(iconId = browser.selectedId) {
    onConfirm(iconId);
    onClose();
  }

  return (
    <div
      aria-label={`Choose ${label}`}
      aria-modal="true"
      className="icon-browser"
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
    >
      <header className="icon-browser__header">
        <div>
          <p className="eyebrow">Therapy Studio Icon Browser</p>
          <h2>Choose {label}</h2>
        </div>
        <button aria-label="Close Icon Browser" onClick={onClose} type="button">
          <X aria-hidden="true" size={20} />
        </button>
      </header>
      <IconSearch onChange={browser.setQuery} value={browser.query} />
      <div className="icon-browser__body">
        <IconSidebar
          activeGroup={browser.group}
          groups={browser.groups}
          onSelect={browser.setGroup}
        />
        <main className="icon-browser__results">
          <p aria-live="polite">
            Showing {browser.visibleIcons.length} of {browser.matches.length} icons
          </p>
          <IconGrid
            icons={browser.visibleIcons}
            onConfirm={confirm}
            onSelect={browser.setSelectedId}
            selectedId={browser.selectedId}
          />
          {!browser.matches.length ? <p>No icons match that search.</p> : null}
          {browser.hasMore ? (
            <button onClick={browser.loadMore} type="button">
              Load More Icons
            </button>
          ) : null}
        </main>
        <IconPreview
          icon={browser.selectedIcon}
          onClear={() => confirm("prompt-default")}
          onConfirm={() => confirm()}
        />
      </div>
    </div>
  );
}
