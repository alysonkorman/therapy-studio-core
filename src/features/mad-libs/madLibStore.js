const key = "therapy-studio:mad-libs-custom";
export const blankTypes = [
  "noun",
  "plural noun",
  "verb",
  "past-tense verb",
  "adjective",
  "adverb",
  "person",
  "place",
  "animal",
  "food",
  "body part",
  "number",
  "exclamation",
  "custom prompt",
];
export const loadCustomMadLibs = () => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};
export const saveCustomMadLibs = (templates) =>
  localStorage.setItem(key, JSON.stringify(templates));
export const duplicateMadLib = (template) => ({
  ...template,
  id: `custom-${crypto.randomUUID()}`,
  title: `${template.title} (copy)`,
  custom: true,
  blanks: template.blanks.map((blank, index) => ({
    ...blank,
    id: `blank-${index}-${crypto.randomUUID().slice(0, 5)}`,
  })),
});
