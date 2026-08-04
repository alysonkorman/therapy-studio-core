import { Plus, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { sessionProfileRepository } from "../../lib/data";
import {
  clearActiveProfileIfMatching,
  useActiveSessionProfileStore,
} from "../../stores/activeSessionProfileStore";
import ActiveSessionProfileControls from "./ActiveSessionProfileControls";
import SessionProfileCard from "./SessionProfileCard";
import SessionProfileEditor from "./SessionProfileEditor";

import "./SessionProfilesPage.css";

export default function ClientsPage({ repository = sessionProfileRepository }) {
  const [profiles, setProfiles] = useState([]);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const activeId = useActiveSessionProfileStore((state) => state.activeProfileId);
  const setActive = useActiveSessionProfileStore((state) => state.setActiveProfile);
  const refresh = useCallback(async () => {
    try {
      setProfiles(
        await repository.searchSessionProfiles(query, { includeArchived: showArchived })
      );
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [query, repository, showArchived]);
  useEffect(() => {
    let current = true;
    repository
      .searchSessionProfiles(query, { includeArchived: showArchived })
      .then((results) => {
        if (current) {
          setProfiles(results);
          setError("");
        }
      })
      .catch((loadError) => {
        if (current) setError(loadError.message);
      });
    return () => {
      current = false;
    };
  }, [query, repository, showArchived]);
  const save = async (draft) => {
    if (editing) {
      const { id, archived, createdAt, updatedAt, lastOpenedAt, ...changes } = draft;
      void id;
      void archived;
      void createdAt;
      void updatedAt;
      void lastOpenedAt;
      await repository.updateSessionProfile(editing.id, changes);
    } else await repository.createSessionProfile(draft);
    setEditing(null);
    setCreating(false);
    await refresh();
  };
  const action = async (name, profile) => {
    if (name === "activate") await setActive(profile.id, repository);
    if (name === "duplicate") await repository.duplicateSessionProfile(profile.id);
    if (name === "archive") {
      await repository.archiveSessionProfile(profile.id);
      clearActiveProfileIfMatching(profile.id);
    }
    if (name === "restore") await repository.restoreSessionProfile(profile.id);
    if (name === "delete") {
      await repository.deleteSessionProfilePermanently(profile.id);
      clearActiveProfileIfMatching(profile.id);
    }
    await refresh();
  };
  const recent = profiles
    .filter((profile) => profile.lastOpenedAt && !profile.archived)
    .slice(0, 3);
  return (
    <div className="session-profiles-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Reusable therapeutic context</span>
          <h1>Session Profiles</h1>
          <p>Prepare a flexible workspace without creating a clinical record.</p>
        </div>
        {!creating && !editing ? (
          <button
            className="primary-button"
            onClick={() => setCreating(true)}
            type="button"
          >
            <Plus size={18} />
            Create Profile
          </button>
        ) : null}
      </header>
      <p className="profile-privacy-notice">
        Use a nickname or general label. Do not enter identifying client information.
      </p>
      <ActiveSessionProfileControls />
      {creating || editing ? (
        <SessionProfileEditor
          initialProfile={editing}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={save}
        />
      ) : null}
      <div className="profile-toolbar">
        <label>
          <Search size={17} />
          <span className="sr-only">Search Session Profiles</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search profiles"
            value={query}
          />
        </label>
        <label>
          <input
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
            type="checkbox"
          />
          Show Archived
        </label>
      </div>
      {recent.length ? (
        <section>
          <h2>Recently Opened</h2>
          <div className="session-profile-grid">
            {recent.map((profile) => (
              <SessionProfileCard
                active={activeId === profile.id}
                key={`recent-${profile.id}`}
                onAction={action}
                onEdit={setEditing}
                profile={profile}
              />
            ))}
          </div>
        </section>
      ) : null}
      <section>
        <h2>{showArchived ? "All Session Profiles" : "Session Profiles"}</h2>
        {error ? (
          <p role="alert">{error}</p>
        ) : profiles.length ? (
          <div className="session-profile-grid">
            {profiles.map((profile) => (
              <SessionProfileCard
                active={activeId === profile.id}
                key={profile.id}
                onAction={action}
                onEdit={setEditing}
                profile={profile}
              />
            ))}
          </div>
        ) : (
          <div className="profile-empty">
            <h3>No Session Profiles Found</h3>
            <p>
              {query
                ? "Try a different search."
                : "Create a generic profile when you are ready."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
