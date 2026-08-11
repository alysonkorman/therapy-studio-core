import { IconRenderer } from "../icons";
import resolvePromptVisualId from "./resolvePromptVisualId";

export default function PromptVisual({ className, deck, prompt, size = 32 }) {
  return (
    <span className={className}>
      <IconRenderer iconId={resolvePromptVisualId(prompt, deck)} size={size} />
    </span>
  );
}
