import { create } from "zustand";

import { sessionProfileRepository } from "../lib/data";
import { applySessionProfileToCurrentSession } from "../engines/sessions/mapSessionProfileToCurrentSession";
import { useCurrentSessionStore } from "./currentSessionStore";

export const useActiveSessionProfileStore = create((set, get) => ({
  activeProfileId: null,
  activeProfile: null,
  setActiveProfile: async (profileId, repository = sessionProfileRepository) => {
    const profile = await repository.markSessionProfileOpened(profileId);
    set({ activeProfileId: profile.id, activeProfile: profile });
    return profile;
  },
  clearActiveProfile: () => set({ activeProfileId: null, activeProfile: null }),
  getActiveProfile: () => get().activeProfile,
  refreshActiveProfile: async (repository = sessionProfileRepository) => {
    const { activeProfileId } = get();
    if (!activeProfileId) return null;
    const profile = await repository.getSessionProfileById(activeProfileId);
    set({ activeProfile: profile });
    return profile;
  },
  loadProfileIntoCurrentSession: (profile, options = {}) => {
    const currentStore = useCurrentSessionStore.getState();
    const next = applySessionProfileToCurrentSession(
      profile,
      currentStore.context,
      options
    );
    if (next !== currentStore.context) currentStore.updateContext(next);
    return next;
  },
}));

export function clearActiveProfileIfMatching(profileId) {
  if (useActiveSessionProfileStore.getState().activeProfileId === profileId) {
    useActiveSessionProfileStore.getState().clearActiveProfile();
  }
}
