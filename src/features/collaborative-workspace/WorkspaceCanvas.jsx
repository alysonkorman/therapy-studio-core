import WorkspaceObject from "./WorkspaceObject";

export default function WorkspaceCanvas({
  canMoveBackward,
  canMoveForward,
  document,
  onChangeObject,
  onSelect,
  onSelectedAction,
  selectedId,
}) {
  const background = document.background === "meadow" ? "outdoors" : document.background;

  return (
    <div
      aria-label="Scene canvas"
      className={`workspace-canvas workspace-canvas--${background}`}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onSelect(null);
      }}
    >
      <div aria-hidden="true" className="workspace-scene">
        <div className="workspace-scene__wall" />
        <div className="workspace-scene__window" />
        <div className="workspace-scene__rug" />
        <div className="workspace-scene__sun" />
        <div className="workspace-scene__hill workspace-scene__hill--back" />
        <div className="workspace-scene__hill workspace-scene__hill--front" />
        <div className="workspace-scene__sand-lines" />
      </div>
      {document.objects.length === 0 ? (
        <div className="workspace-canvas__welcome">
          <span aria-hidden="true">✨</span>
          <strong>Tell a story here</strong>
          <p>Choose a scene piece to begin.</p>
        </div>
      ) : null}
      {document.objects.map((object) => (
        <WorkspaceObject
          key={object.id}
          object={object}
          objectControls={
            selectedId === object.id
              ? {
                  canMoveBackward,
                  canMoveForward,
                  onAction: onSelectedAction,
                }
              : null
          }
          onChange={(changes) => onChangeObject(object.id, changes)}
          onSelect={onSelect}
          selected={selectedId === object.id}
        />
      ))}
    </div>
  );
}
