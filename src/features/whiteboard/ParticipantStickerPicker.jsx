import { X } from "lucide-react";
import { useMemo, useState } from "react";

import { IconRenderer } from "../icons";
import { getIconManifest } from "../../services/icons";

const categories = [
  ["Faces", /face|emotion|smile|happy|sad|feeling/i],
  ["Animals", /animal|dog|cat|bird|fish|bear|lion|rabbit/i],
  ["Nature", /tree|flower|sun|moon|cloud|plant|rainbow/i],
  ["Things", /toy|ball|car|book|food|music|game/i],
  ["Symbols", /heart|star|check|arrow|shape|symbol/i],
];

function matchingIcons(category) {
  const [, pattern] = category;
  return getIconManifest()
    .filter((icon) => pattern.test(`${icon.label} ${icon.keywords}`))
    .slice(0, 18);
}

export default function ParticipantStickerPicker({ onChoose, onClose }) {
  const [activeCategory, setActiveCategory] = useState(categories[0][0]);
  const iconsByCategory = useMemo(
    () => new Map(categories.map((category) => [category[0], matchingIcons(category)])),
    []
  );
  const visible = iconsByCategory.get(activeCategory) ?? [];

  return (
    <section
      aria-label="Choose a sticker"
      aria-modal="true"
      className="whiteboard-sticker-picker"
      role="dialog"
    >
      <header>
        <h2>Pick a sticker</h2>
        <button aria-label="Close stickers" onClick={onClose} type="button">
          <X aria-hidden="true" size={22} />
        </button>
      </header>
      <div
        aria-label="Sticker categories"
        className="whiteboard-sticker-picker__categories"
      >
        {categories.map(([name]) => (
          <button
            aria-pressed={activeCategory === name}
            key={name}
            onClick={() => setActiveCategory(name)}
            type="button"
          >
            {name}
          </button>
        ))}
      </div>
      <div
        aria-label={`${activeCategory} stickers`}
        className="whiteboard-sticker-picker__grid"
      >
        {visible.map((icon) => (
          <button
            aria-label={`Add ${icon.label} sticker`}
            key={icon.id}
            onClick={() => onChoose(icon.id)}
            type="button"
          >
            <IconRenderer decorative iconId={icon.id} size={52} />
          </button>
        ))}
      </div>
    </section>
  );
}
