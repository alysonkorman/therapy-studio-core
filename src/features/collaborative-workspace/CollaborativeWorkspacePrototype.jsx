import { useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";

import AssetTray from "./AssetTray";
import BackgroundChooser from "./BackgroundChooser";
import ObjectControls from "./ObjectControls";
import WorkspaceCanvas from "./WorkspaceCanvas";
import {
  browseSceneAssets,
  getSceneAssetCategories,
  SCENE_ASSET_PAGE_SIZE,
} from "./sceneAssetLibrary";
import { sampleWorkspaceBackgrounds } from "./sampleBackgrounds";
import useCollaborativeWorkspaceDocument from "./useCollaborativeWorkspaceDocument";
import {
  calculateInitialWorkspaceObjectSize,
  constrainWorkspaceObjectSize,
  normalizeWorkspaceRotation,
} from "./workspaceDocument";
import "./CollaborativeWorkspacePrototype.css";

export default function CollaborativeWorkspacePrototype() {
  const { changeDocument, connection, document } = useCollaborativeWorkspaceDocument();
  // Search and selection are participant-local and never enter the collaboration adapter.
  const [assetQuery, setAssetQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [assetLimit, setAssetLimit] = useState(SCENE_ASSET_PAGE_SIZE);
  const [selectedId, setSelectedId] = useState(null);
  const assetRatiosRef = useRef(new Map());
  const categories = useMemo(() => getSceneAssetCategories(), []);
  const assetResults = useMemo(
    () =>
      browseSceneAssets({
        categoryId: selectedCategory,
        limit: assetLimit,
        query: assetQuery,
      }),
    [assetLimit, assetQuery, selectedCategory]
  );
  const selectedIndex = document.objects.findIndex(({ id }) => id === selectedId);
  const selectedObject = document.objects[selectedIndex];
  const selectedBackground =
    document.background === "meadow" ? "outdoors" : document.background;

  function addObject(asset) {
    const offset = (document.objects.length % 5) * 22;
    const id = nanoid();
    const size = calculateInitialWorkspaceObjectSize(
      assetRatiosRef.current.get(asset.id)
    );
    changeDocument({
      type: "object/add",
      asset,
      overrides: { id, x: 235 + offset, y: 180 + offset, ...size },
    });
    setSelectedId(id);
  }

  function handleSelectedAction(action) {
    if (!selectedObject) return;
    if (action === "delete") {
      changeDocument({ type: "object/delete", objectId: selectedId });
      setSelectedId(null);
    } else if (action === "duplicate") {
      changeDocument({ type: "object/duplicate", objectId: selectedId });
    } else if (action === "reset-rotation") {
      changeDocument({
        type: "object/update",
        objectId: selectedId,
        changes: { rotation: 0 },
      });
    } else if (action === "rotate") {
      changeDocument({
        type: "object/update",
        objectId: selectedId,
        changes: { rotation: normalizeWorkspaceRotation(selectedObject.rotation + 15) },
      });
    } else if (action === "bigger" || action === "smaller") {
      const amount = action === "bigger" ? 24 : -24;
      const longestSide = Math.max(selectedObject.width, selectedObject.height);
      changeDocument({
        type: "object/update",
        objectId: selectedId,
        changes: constrainWorkspaceObjectSize(
          selectedObject,
          (longestSide + amount) / longestSide
        ),
      });
    } else {
      changeDocument({
        type: "object/layer",
        objectId: selectedId,
        direction: action === "forward" ? 1 : -1,
      });
    }
  }

  return (
    <div className="collaborative-workspace-prototype">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Play together</p>
          <h1>Scene Builder</h1>
          <p>Choose characters and objects, then move them around to tell your story.</p>
        </div>
        <div className="workspace-status" aria-label="Collaboration status">
          <span aria-hidden="true" />
          {!connection.available
            ? "Collaboration unavailable"
            : connection.peerCount > 0
              ? `${connection.peerCount + 1} here together`
              : "Ready to share"}
        </div>
      </header>

      <div className="workspace-layout">
        <AssetTray
          assets={assetResults.assets}
          categories={categories}
          onAdd={addObject}
          onAssetRatio={(assetId, ratio) => assetRatiosRef.current.set(assetId, ratio)}
          onCategoryChange={(category) => {
            setSelectedCategory(category);
            setAssetLimit(SCENE_ASSET_PAGE_SIZE);
          }}
          onQueryChange={(query) => {
            setAssetQuery(query);
            setAssetLimit(SCENE_ASSET_PAGE_SIZE);
          }}
          onShowMore={() => setAssetLimit((current) => current + SCENE_ASSET_PAGE_SIZE)}
          query={assetQuery}
          selectedCategory={selectedCategory}
          total={assetResults.total}
        />
        <section className="workspace-stage" aria-label="Activity area">
          <div className="workspace-stage__topline">
            <BackgroundChooser
              backgrounds={sampleWorkspaceBackgrounds}
              onChange={(background) =>
                changeDocument({ type: "background/update", background })
              }
              value={selectedBackground}
            />
            <span>
              {document.objects.length}{" "}
              {document.objects.length === 1 ? "piece" : "pieces"}
            </span>
          </div>
          {selectedObject ? (
            <ObjectControls
              canMoveBackward={selectedIndex > 0}
              canMoveForward={selectedIndex < document.objects.length - 1}
              key={selectedId}
              object={selectedObject}
              onAction={handleSelectedAction}
            />
          ) : (
            <div className="workspace-selection-tip">
              Select an object to see its controls.
            </div>
          )}
          <WorkspaceCanvas
            document={document}
            onChangeObject={(objectId, changes) =>
              changeDocument({ type: "object/update", objectId, changes })
            }
            onSelect={setSelectedId}
            selectedId={selectedId}
          />
        </section>
      </div>
    </div>
  );
}
