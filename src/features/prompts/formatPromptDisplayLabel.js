const CLINICAL_ACRONYMS = new Map(
  ["ACT", "ADHD", "CBT", "DBT", "EMDR", "ERP", "OCD", "PTSD"].map((acronym) => [
    acronym.toLocaleLowerCase(),
    acronym,
  ])
);

const DISPLAY_LABEL_OVERRIDES = new Map([
  ["self-esteem", "Self-Esteem"],
  ["strengths-based", "Strengths-Based"],
]);

export default function formatPromptDisplayLabel(value) {
  if (!value) return "";
  const rawValue = String(value).trim();
  const override = DISPLAY_LABEL_OVERRIDES.get(rawValue.toLocaleLowerCase());
  if (override) return override;

  return rawValue
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\p{L}+/gu, (word) => {
      const acronym = CLINICAL_ACRONYMS.get(word.toLocaleLowerCase());
      return (
        acronym ?? `${word[0].toLocaleUpperCase()}${word.slice(1).toLocaleLowerCase()}`
      );
    });
}
