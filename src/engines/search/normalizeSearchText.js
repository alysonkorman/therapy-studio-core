export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’‛`´]/g, "'")
    .replace(/'/g, "")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeSearchQuery(query) {
  return [...new Set(normalizeSearchText(query).split(" ").filter(Boolean))];
}
