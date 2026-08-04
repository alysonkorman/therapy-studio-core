import { useState } from "react";

export default function SessionProfileCard({ active, onAction, onEdit, profile }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <article className="session-profile-card">
      <header>
        <div>
          <h2>{profile.displayName}</h2>
          <p>
            {[profile.ageRange, ...profile.interests.slice(0, 3)]
              .filter(Boolean)
              .join(" · ") || "Reusable session context"}
          </p>
        </div>
        {active ? <span className="session-active-indicator">Active</span> : null}
      </header>
      <div className="profile-actions">
        <button onClick={() => onAction("activate", profile)} type="button">
          {active ? "Use for Current Session" : "Set Active"}
        </button>
        <button onClick={() => onEdit(profile)} type="button">
          Edit
        </button>
        <button onClick={() => onAction("duplicate", profile)} type="button">
          Duplicate
        </button>
        <button
          onClick={() => onAction(profile.archived ? "restore" : "archive", profile)}
          type="button"
        >
          {profile.archived ? "Restore" : "Archive"}
        </button>
        {profile.archived ? (
          <button
            className="destructive-button"
            onClick={() => setConfirmDelete(true)}
            type="button"
          >
            Delete Permanently
          </button>
        ) : null}
      </div>
      {confirmDelete ? (
        <div className="profile-delete-confirmation" role="alert">
          <p>Permanently delete {profile.displayName}?</p>
          <button
            className="destructive-button"
            onClick={() => onAction("delete", profile)}
            type="button"
          >
            Yes, Delete
          </button>
          <button onClick={() => setConfirmDelete(false)} type="button">
            Cancel
          </button>
        </div>
      ) : null}
    </article>
  );
}
