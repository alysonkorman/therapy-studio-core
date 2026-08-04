const normalizedSet = (values = []) =>
  new Set(values.map((value) => value.trim().toLocaleLowerCase()).filter(Boolean));
const overlaps = (left, right) => {
  const rightSet = normalizedSet(right);
  return [...normalizedSet(left)].some((value) => rightSet.has(value));
};

export function getSessionProfileCompatibility(resource, profile) {
  if (!profile) return [];
  const indicators = [];
  if (
    profile.ageRange &&
    normalizedSet(resource.ageRanges).has(profile.ageRange.toLocaleLowerCase())
  )
    indicators.push("Matches age range");
  if (overlaps(profile.diagnoses, resource.diagnoses))
    indicators.push("Matches diagnosis");
  if (overlaps(profile.goals, resource.goals)) indicators.push("Matches goal");
  if (
    overlaps(profile.interests, [
      ...(resource.kidsWhoLike ?? []),
      ...(resource.tags ?? []),
    ])
  )
    indicators.push("Matches interest or tag");
  if (
    profile.sessionLengthPreference &&
    resource.durationMinutes &&
    resource.durationMinutes <= profile.sessionLengthPreference
  )
    indicators.push("Fits session length");
  if (profile.telehealth === true && resource.telehealthFriendly)
    indicators.push("Telehealth compatible");
  return indicators;
}
