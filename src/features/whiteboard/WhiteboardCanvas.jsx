import { IconRenderer } from "../icons";

function pointsValue(points) {
  return points.map(({ x, y }) => `${x},${y}`).join(" ");
}

export default function WhiteboardCanvas({
  document,
  draftStroke,
  onCanvasPointerDown,
  onObjectPointerDown,
  onPointerMove,
  onPointerUp,
  onStrokeErase,
  selectedId,
  tool,
}) {
  return (
    <svg
      aria-label="Whiteboard canvas"
      className={`whiteboard-canvas whiteboard-canvas--${tool}`}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="img"
      viewBox="0 0 1000 700"
    >
      <rect className="whiteboard-canvas__background" height="700" width="1000" />
      {document.objects.map((object) => {
        if (object.kind === "stroke") {
          return (
            <polyline
              aria-label="Drawing stroke"
              className="whiteboard-stroke"
              fill="none"
              key={object.id}
              onPointerDown={(event) => onStrokeErase(event, object.id)}
              points={pointsValue(object.points)}
              stroke={object.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={object.width}
            />
          );
        }
        if (object.kind === "text") {
          return (
            <text
              aria-label={`Text object: ${object.text}`}
              className={selectedId === object.id ? "is-selected" : undefined}
              fill={object.color}
              fontSize={object.size}
              key={object.id}
              onPointerDown={(event) => onObjectPointerDown(event, object)}
              role="button"
              tabIndex="0"
              x={object.x}
              y={object.y}
            >
              {object.text}
            </text>
          );
        }
        return (
          <foreignObject
            aria-label={`Visual object: ${object.iconId}`}
            className={selectedId === object.id ? "is-selected" : undefined}
            height={object.height}
            key={object.id}
            onPointerDown={(event) => onObjectPointerDown(event, object)}
            role="button"
            tabIndex="0"
            width={object.width}
            x={object.x}
            y={object.y}
          >
            <div className="whiteboard-visual">
              <IconRenderer decorative iconId={object.iconId} size={object.width} />
            </div>
          </foreignObject>
        );
      })}
      {draftStroke ? (
        <polyline
          fill="none"
          points={pointsValue(draftStroke.points)}
          stroke={draftStroke.color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={draftStroke.width}
        />
      ) : null}
    </svg>
  );
}
