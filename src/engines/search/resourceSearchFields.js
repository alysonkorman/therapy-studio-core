function arrayValues(value) {
  return Array.isArray(value) ? value : [];
}

function scalarValue(value) {
  return value === null || value === undefined || value === "" ? [] : [value];
}

export const resourceSearchFields = [
  {
    key: "title",
    label: "title",
    weight: 120,
    values: (resource) => scalarValue(resource.title),
  },
  {
    key: "classification",
    label: "resource type or category",
    weight: 90,
    values: (resource) => [
      ...scalarValue(resource.type),
      ...scalarValue(resource.category),
    ],
  },
  {
    key: "tags",
    label: "tag",
    weight: 80,
    values: (resource) => arrayValues(resource.tags),
  },
  {
    key: "worksWellWhen",
    label: "Works Well When",
    weight: 70,
    values: (resource) => arrayValues(resource.worksWellWhen),
  },
  {
    key: "clinical",
    label: "goal or diagnosis",
    weight: 60,
    values: (resource) => [
      ...arrayValues(resource.goals),
      ...arrayValues(resource.diagnoses),
    ],
  },
  {
    key: "description",
    label: "description",
    weight: 50,
    values: (resource) => scalarValue(resource.description),
  },
  {
    key: "metadata",
    label: "resource details",
    weight: 30,
    values: (resource) => [
      ...arrayValues(resource.kidsWhoLike),
      ...arrayValues(resource.useWith),
      ...arrayValues(resource.ageRanges),
      ...arrayValues(resource.settings),
      ...arrayValues(resource.materials),
      ...arrayValues(resource.research),
      ...scalarValue(resource.durationMinutes).flatMap((duration) => [
        `${duration} minutes`,
        `${duration} min`,
      ]),
      ...(resource.telehealthFriendly ? ["telehealth", "telehealth friendly"] : []),
      ...scalarValue(resource.source),
      ...scalarValue(resource.myNotes),
    ],
  },
  {
    key: "promptText",
    label: "prompt text",
    weight: 10,
    values: (resource) =>
      arrayValues(resource.prompts)
        .map((prompt) => prompt.text)
        .filter(Boolean),
  },
];
