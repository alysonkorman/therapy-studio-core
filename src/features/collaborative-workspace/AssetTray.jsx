import { Search } from "lucide-react";

import WorkspaceAssetImage from "./WorkspaceAssetImage";

export default function AssetTray({
  assets,
  categories,
  onAdd,
  onAssetRatio,
  onCategoryChange,
  onQueryChange,
  query,
  selectedCategory,
  total,
  onShowMore,
}) {
  return (
    <aside className="workspace-asset-tray" aria-label="Asset tray">
      <div className="workspace-asset-tray__heading">
        <p className="eyebrow">Scene pieces</p>
        <h2>What belongs here?</h2>
        <p>Choose a picture and it will appear in your scene.</p>
      </div>
      <label className="workspace-asset-search">
        <Search aria-hidden="true" size={18} />
        <span className="sr-only">Search scene pieces</span>
        <input
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Find a picture"
          type="search"
          value={query}
        />
      </label>
      <div className="workspace-categories" aria-label="Scene piece categories">
        {categories.map((category) => (
          <button
            aria-pressed={selectedCategory === category.id}
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            type="button"
          >
            <span aria-hidden="true">{category.symbol}</span>
            {category.label}
          </button>
        ))}
      </div>
      <div className="workspace-asset-grid">
        {assets.map((asset) => (
          <button
            className="workspace-asset"
            key={asset.id}
            onClick={() => onAdd(asset)}
            type="button"
          >
            <span className="workspace-asset__picture">
              <WorkspaceAssetImage
                assetId={asset.id}
                className="workspace-asset__image"
                decorative
                label={asset.label}
                onAspectRatio={(ratio) => onAssetRatio(asset.id, ratio)}
              />
            </span>
            <strong>{asset.label}</strong>
          </button>
        ))}
      </div>
      {assets.length === 0 ? (
        <p className="workspace-empty-search">No scene pieces found. Try another word.</p>
      ) : null}
      {assets.length < total ? (
        <button className="workspace-show-more" onClick={onShowMore} type="button">
          Show more pieces
        </button>
      ) : null}
    </aside>
  );
}
