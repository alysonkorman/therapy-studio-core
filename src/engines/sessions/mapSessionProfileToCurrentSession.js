const join = (value) => value.join(", ");

export function mapSessionProfileToCurrentSession(profile) {
  return {
    genericClientId: profile.displayName,
    ageRange: profile.ageRange ?? "",
    diagnoses: join(profile.diagnoses),
    goals: join(profile.goals),
    interests: join(profile.interests),
    currentState: join(profile.currentPresentationDefaults),
    sessionLengthMinutes:
      profile.sessionLengthPreference === null
        ? ""
        : String(profile.sessionLengthPreference),
    telehealthSetting:
      profile.telehealth === null ? "" : profile.telehealth ? "telehealth" : "",
    materialsAvailable: join(profile.materialsUsuallyAvailable),
    sensoryPreferences: join(profile.sensoryPreferences),
    communicationStyle: join(profile.communicationStyle),
    regulationStrategies: join(profile.regulationStrategies),
    readingTolerance: profile.readingTolerance ?? "",
    writingTolerance: profile.writingTolerance ?? "",
    humor: join(profile.humorPreferences),
    motivators: join(profile.motivators),
    strengths: join(profile.strengths),
    thingsToAvoid: join(profile.thingsToAvoid),
    customNotes: profile.generalReminders,
  };
}

export function applySessionProfileToCurrentSession(
  profile,
  context,
  { mode = "fill-empty" } = {}
) {
  if (mode === "cancel") return context;
  const mapped = mapSessionProfileToCurrentSession(profile);
  if (mode === "replace") return { ...context, ...mapped };
  return Object.fromEntries(
    Object.entries(context).map(([field, value]) => [
      field,
      String(value).trim() ? value : (mapped[field] ?? value),
    ])
  );
}
