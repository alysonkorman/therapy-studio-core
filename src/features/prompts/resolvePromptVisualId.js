export default function resolvePromptVisualId(prompt, deck) {
  return prompt?.iconId ?? deck?.iconId;
}
