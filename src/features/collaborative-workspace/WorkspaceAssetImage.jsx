import { Shapes } from "lucide-react";
import { useEffect, useState } from "react";

import { loadIconAsset } from "../../services/icons";

export default function WorkspaceAssetImage({
  assetId,
  className = "",
  decorative = false,
  label,
  onAspectRatio,
}) {
  const [loaded, setLoaded] = useState({ assetId: "", source: null });

  useEffect(() => {
    let active = true;
    void loadIconAsset(assetId)
      .then((loadedSource) => {
        if (active) setLoaded({ assetId, source: loadedSource });
      })
      .catch(() => {
        if (active) setLoaded({ assetId, source: null });
      });
    return () => {
      active = false;
    };
  }, [assetId]);

  const source = loaded.assetId === assetId ? loaded.source : null;

  return source ? (
    <img
      alt={decorative ? "" : label}
      className={className}
      draggable="false"
      onLoad={(event) => {
        const { naturalHeight, naturalWidth } = event.currentTarget;
        if (naturalHeight > 0) onAspectRatio?.(naturalWidth / naturalHeight);
      }}
      src={source}
    />
  ) : (
    <Shapes
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `Loading ${label}`}
      className={className}
    />
  );
}
