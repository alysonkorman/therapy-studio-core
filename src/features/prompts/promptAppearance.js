export const DEFAULT_PROMPT_COLOR = "#6C46C3";
export const PROMPT_COLORS = [
  "#6C46C3",
  "#2D7D73",
  "#A64B6B",
  "#B5651D",
  "#3267A8",
  "#5D6B38",
];

export function normalizePromptColor(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : null;
}

export function readablePromptForeground(color) {
  const normalized = normalizePromptColor(color);
  if (!normalized) return "#FFFFFF";
  const [red, green, blue] = [1, 3, 5].map((start) =>
    Number.parseInt(normalized.slice(start, start + 2), 16)
  );
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 154 ? "#1D2433" : "#FFFFFF";
}

export function promptAccentStyle(color) {
  const normalized = normalizePromptColor(color);
  return normalized
    ? {
        "--prompt-identity-color": normalized,
        "--prompt-identity-foreground": readablePromptForeground(normalized),
        "--prompt-identity-soft": `${normalized}1F`,
        "--prompt-identity-softer": `${normalized}0D`,
      }
    : undefined;
}
