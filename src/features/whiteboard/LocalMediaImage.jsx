import { useEffect, useState } from "react";

export default function LocalMediaImage({ assetId, label, repository }) {
  const [url, setUrl] = useState("");
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    repository
      .getAsset(assetId)
      .then((asset) => {
        if (!active) return;
        if (!asset?.blob) {
          setMissing(true);
          return;
        }
        objectUrl = URL.createObjectURL(asset.blob);
        setUrl(objectUrl);
      })
      .catch(() => active && setMissing(true));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId, repository]);

  if (missing)
    return <span className="whiteboard-image-missing">Activity image unavailable</span>;
  return url ? (
    <img alt={label} draggable="false" src={url} />
  ) : (
    <span>Loading activity…</span>
  );
}
