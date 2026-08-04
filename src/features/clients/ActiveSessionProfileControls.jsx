import { useState } from "react";
import { Link, useInRouterContext } from "react-router-dom";

import { useActiveSessionProfileStore } from "../../stores/activeSessionProfileStore";
import {
  hasCurrentSessionContext,
  useCurrentSessionStore,
} from "../../stores/currentSessionStore";

function SessionProfilesLink({ children, inRouter }) {
  return inRouter ? (
    <Link to="/clients">{children}</Link>
  ) : (
    <a href="/clients">{children}</a>
  );
}

export default function ActiveSessionProfileControls() {
  const inRouter = useInRouterContext();
  const profile = useActiveSessionProfileStore((state) => state.activeProfile);
  const clear = useActiveSessionProfileStore((state) => state.clearActiveProfile);
  const apply = useActiveSessionProfileStore(
    (state) => state.loadProfileIntoCurrentSession
  );
  const context = useCurrentSessionStore((state) => state.context);
  const [choosing, setChoosing] = useState(false);
  if (!profile)
    return (
      <div className="active-profile-controls">
        <span>No active Session Profile</span>
        <SessionProfilesLink inRouter={inRouter}>Choose Profile</SessionProfilesLink>
      </div>
    );
  const applyProfile = (mode) => {
    apply(profile, { mode });
    setChoosing(false);
  };
  return (
    <div className="active-profile-controls">
      <div>
        <span>Active Session Profile</span>
        <strong>{profile.displayName}</strong>
      </div>
      <SessionProfilesLink inRouter={inRouter}>Change Profile</SessionProfilesLink>
      <button
        onClick={() =>
          hasCurrentSessionContext(context)
            ? setChoosing(true)
            : applyProfile("fill-empty")
        }
        type="button"
      >
        Use Profile for Current Session
      </button>
      <button onClick={clear} type="button">
        Clear Profile
      </button>
      {choosing ? (
        <div
          className="profile-apply-confirmation"
          role="dialog"
          aria-label="Use Session Profile"
        >
          <p>
            Current Session already contains information. How should this profile be used?
          </p>
          <button onClick={() => applyProfile("fill-empty")} type="button">
            Fill Only Empty Fields
          </button>
          <button onClick={() => applyProfile("replace")} type="button">
            Replace Matching Fields
          </button>
          <button onClick={() => setChoosing(false)} type="button">
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}
