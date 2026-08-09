function normalized(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase();
}

function searchableText(intervention) {
  return [
    intervention.title,
    intervention.description,
    intervention.tags,
    intervention.goals,
    intervention.diagnoses,
    intervention.ageRanges,
    intervention.worksWellWhen,
    intervention.materials,
  ]
    .flat()
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

export function filterInterventions(
  interventions,
  { query = "", goal = "", ageRange = "", maxDuration = "", telehealthOnly = false } = {}
) {
  const searchQuery = normalized(query);
  const goalQuery = normalized(goal);

  return interventions.filter((intervention) => {
    if (searchQuery && !searchableText(intervention).includes(searchQuery)) return false;
    if (goalQuery && !intervention.goals.some((item) => normalized(item) === goalQuery)) {
      return false;
    }
    if (ageRange && !intervention.ageRanges.includes(ageRange)) return false;
    if (
      maxDuration &&
      (intervention.durationMinutes === null ||
        intervention.durationMinutes > Number(maxDuration))
    ) {
      return false;
    }
    if (telehealthOnly && !intervention.telehealthFriendly) return false;
    return true;
  });
}
