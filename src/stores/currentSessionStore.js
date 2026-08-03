import { create } from "zustand";

export const emptyCurrentSession = {
  genericClientId: "",
  ageRange: "",
  diagnoses: "",
  goals: "",
  interests: "",
  currentState: "",
  sessionLengthMinutes: "",
  telehealthSetting: "",
  materialsAvailable: "",
  sensoryPreferences: "",
  communicationStyle: "",
  regulationStrategies: "",
  readingTolerance: "",
  writingTolerance: "",
  interactionPreference: "",
  creativityPreference: "",
  humor: "",
  transitionDifficulty: "",
  motivators: "",
  strengths: "",
  thingsToAvoid: "",
  customNotes: "",
};

const currentSessionFields = new Set(Object.keys(emptyCurrentSession));

function assertApprovedField(field) {
  if (!currentSessionFields.has(field)) {
    throw new TypeError(`Unknown Current Session field: ${String(field)}`);
  }
}

function validateUpdates(updates) {
  for (const field of Object.keys(updates)) {
    assertApprovedField(field);
  }
}

export function hasCurrentSessionContext(context) {
  return Object.values(context).some((value) => String(value).trim());
}

export const useCurrentSessionStore = create((set) => ({
  context: { ...emptyCurrentSession },
  updateField: (field, value) => {
    assertApprovedField(field);
    set((state) => ({ context: { ...state.context, [field]: value } }));
  },
  updateContext: (updates) => {
    validateUpdates(updates);
    set((state) => ({ context: { ...state.context, ...updates } }));
  },
  clearContext: () => set({ context: { ...emptyCurrentSession } }),
}));
