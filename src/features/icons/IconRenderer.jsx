import { Shapes } from "lucide-react";
import { useEffect, useState } from "react";

import { loadIconAsset, resolveIcon } from "../../services/icons";

export default function IconRenderer({ className, iconId, size = 24 }) {
  const icon = resolveIcon(iconId);
  const [loaded, setLoaded] = useState({ iconId: "", src: null, status: "loading" });

  useEffect(() => {
    let active = true;
    void loadIconAsset(iconId)
      .then((src) => {
        if (active) {
          setLoaded({ iconId, src, status: src ? "loaded" : "fallback" });
        }
      })
      .catch(() => {
        if (active) setLoaded({ iconId, src: null, status: "fallback" });
      });
    return () => {
      active = false;
    };
  }, [iconId]);

  const current = loaded.iconId === iconId ? loaded : { src: null, status: "loading" };
  const src = current.src;
  return src ? (
    <img
      alt={icon.label}
      className={className}
      height={size}
      loading="lazy"
      src={src}
      width={size}
    />
  ) : current.status === "loading" ? (
    <span aria-label={`Loading ${icon.label}`} role="status">
      <Shapes aria-hidden="true" className={className} size={size} />
    </span>
  ) : (
    <Shapes aria-label={icon.label} className={className} size={size} />
  );
}
