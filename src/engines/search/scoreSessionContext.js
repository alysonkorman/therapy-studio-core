import { normalizeSearchText } from "./normalizeSearchText";

const sessionContextWeights = {
  age: 8,
  diagnosis: 10,
  goal: 10,
  interest: 9,
  currentState: 10,
  telehealth: 4,
  duration: 6,
  materials: 8,
};

function values(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function matchingPair(contextValue, resourceValues) {
  for (const requested of values(contextValue)) {
    const normalizedRequested = normalizeSearchText(requested);
    if (!normalizedRequested) continue;

    for (const available of resourceValues.flatMap(values)) {
      const normalizedAvailable = normalizeSearchText(available);
      if (
        normalizedAvailable.includes(normalizedRequested) ||
        normalizedRequested.includes(normalizedAvailable)
      ) {
        return { requested, available };
      }
    }
  }
  return null;
}

function numericRange(value) {
  const numbers =
    String(value ?? "")
      .match(/\d+/g)
      ?.map(Number) ?? [];
  if (!numbers.length) return null;
  return numbers.length === 1 ? [numbers[0], numbers[0]] : [numbers[0], numbers[1]];
}

function matchingAge(ageRange, resourceAgeRanges) {
  const requested = numericRange(ageRange);
  if (!requested) return null;

  return resourceAgeRanges.find((candidate) => {
    const available = numericRange(candidate);
    return available && requested[0] <= available[1] && available[0] <= requested[1];
  });
}

export function scoreSessionContext(resource, context = {}) {
  let score = 0;
  const matches = [];

  const ageMatch = matchingAge(context.ageRange, resource.ageRanges ?? []);
  if (ageMatch) {
    score += sessionContextWeights.age;
    matches.push(`Matches current age range: ${ageMatch}`);
  }

  const diagnosisMatch = matchingPair(context.diagnoses, resource.diagnoses ?? []);
  if (diagnosisMatch) {
    score += sessionContextWeights.diagnosis;
    matches.push(`Matches current diagnosis: ${diagnosisMatch.available}`);
  }

  const goalMatch = matchingPair(context.goals, resource.goals ?? []);
  if (goalMatch) {
    score += sessionContextWeights.goal;
    matches.push(`Matches current goal: ${goalMatch.available}`);
  }

  const interestMatch = matchingPair(context.interests, [
    ...(resource.tags ?? []),
    ...(resource.kidsWhoLike ?? []),
  ]);
  if (interestMatch) {
    score += sessionContextWeights.interest;
    matches.push(`Matches interest: ${interestMatch.available}`);
  }

  const stateMatch = matchingPair(context.currentState, resource.worksWellWhen ?? []);
  if (stateMatch) {
    score += sessionContextWeights.currentState;
    matches.push(`Matches current state: ${stateMatch.available}`);
  }

  if (
    normalizeSearchText(context.telehealthSetting).includes("telehealth") &&
    resource.telehealthFriendly
  ) {
    score += sessionContextWeights.telehealth;
    matches.push("Fits telehealth setting");
  }

  const sessionLength = Number(context.sessionLengthMinutes);
  if (
    sessionLength > 0 &&
    resource.durationMinutes !== null &&
    resource.durationMinutes !== undefined &&
    resource.durationMinutes <= sessionLength
  ) {
    score += sessionContextWeights.duration;
    matches.push(`Fits ${sessionLength}-minute session`);
  }

  const materialsMatch = matchingPair(
    context.materialsAvailable,
    resource.materials ?? []
  );
  if (materialsMatch) {
    score += sessionContextWeights.materials;
    matches.push(`Uses available material: ${materialsMatch.available}`);
  }

  return { score, matches };
}

export { sessionContextWeights };
