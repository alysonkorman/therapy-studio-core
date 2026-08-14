import { IconRenderer } from "../icons";
import LocalMediaImage from "./LocalMediaImage";

function pointsValue(points) {
  return points.map(({ x, y }) => `${x},${y}`).join(" ");
}

function selectionBox(object) {
  if (object.kind === "arrow") {
    return {
      x: Math.min(object.x1, object.x2),
      y: Math.min(object.y1, object.y2),
      width: Math.max(8, Math.abs(object.x2 - object.x1)),
      height: Math.max(8, Math.abs(object.y2 - object.y1)),
    };
  }
  if (object.kind === "text") {
    return {
      x: object.x - 4,
      y: object.y - object.size,
      width: 220,
      height: object.size + 10,
    };
  }
  return object;
}

export default function WhiteboardCanvas({
  document,
  draftObject,
  onCanvasPointerDown,
  onObjectPointerDown,
  onPointerMove,
  onPointerUp,
  onResizePointerDown,
  onStrokeErase,
  pan,
  selectedId,
  tool,
  zoom,
  mediaRepository,
}) {
  const renderObject = (object, draft = false) => {
    const common =
      draft || object.locked
        ? {}
        : {
            onPointerDown: (event) => onObjectPointerDown(event, object),
            role: "button",
            tabIndex: 0,
          };
    if (object.kind === "stroke")
      return (
        <polyline
          aria-label="Drawing stroke"
          className="whiteboard-stroke"
          fill="none"
          key={object.id}
          onPointerDown={
            draft || object.locked
              ? undefined
              : (event) => {
                  if (tool === "erase") onStrokeErase(event, object);
                  else onObjectPointerDown(event, object);
                }
          }
          points={pointsValue(object.points)}
          stroke={object.color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={object.width}
        />
      );
    if (object.kind === "rectangle")
      return (
        <rect
          aria-label="Rectangle object"
          fill={object.fillColor}
          height={object.height}
          key={object.id}
          rx="6"
          stroke={object.strokeColor}
          strokeWidth={object.strokeWidth}
          width={object.width}
          x={object.x}
          y={object.y}
          {...common}
        />
      );
    if (object.kind === "ellipse")
      return (
        <ellipse
          aria-label="Ellipse object"
          cx={object.x + object.width / 2}
          cy={object.y + object.height / 2}
          fill={object.fillColor}
          key={object.id}
          rx={object.width / 2}
          ry={object.height / 2}
          stroke={object.strokeColor}
          strokeWidth={object.strokeWidth}
          {...common}
        />
      );
    if (object.kind === "arrow")
      return (
        <g aria-label="Arrow object" key={object.id} {...common}>
          <line
            markerEnd="url(#whiteboard-arrowhead)"
            stroke={object.strokeColor}
            strokeLinecap="round"
            strokeWidth={object.strokeWidth}
            x1={object.x1}
            x2={object.x2}
            y1={object.y1}
            y2={object.y2}
          />
          {object.label ? (
            <text
              className="whiteboard-arrow-label"
              fill={object.strokeColor}
              textAnchor="middle"
              x={(object.x1 + object.x2) / 2}
              y={(object.y1 + object.y2) / 2 - 10}
            >
              {object.label}
            </text>
          ) : null}
        </g>
      );
    if (object.kind === "text")
      return (
        <text
          aria-label={`Text object: ${object.text}`}
          fill={object.color}
          fontSize={object.size}
          key={object.id}
          x={object.x}
          y={object.y}
          {...common}
        >
          {object.text}
        </text>
      );
    if (object.kind === "visual")
      return (
        <foreignObject
          aria-label={`Visual object: ${object.iconId}`}
          height={object.height}
          key={object.id}
          width={object.width}
          x={object.x}
          y={object.y}
          {...common}
        >
          <div className="whiteboard-visual">
            <IconRenderer decorative iconId={object.iconId} size={object.width} />
          </div>
        </foreignObject>
      );
    return (
      <foreignObject
        aria-label={`${object.locked ? "Locked " : ""}Activity image: ${object.accessibilityLabel}`}
        className={
          object.locked ? "whiteboard-image whiteboard-image--locked" : "whiteboard-image"
        }
        height={object.height}
        key={object.id}
        width={object.width}
        x={object.x}
        y={object.y}
        {...common}
      >
        <div className="whiteboard-image__content">
          <LocalMediaImage
            assetId={object.assetId}
            label={object.accessibilityLabel}
            repository={mediaRepository}
          />
        </div>
      </foreignObject>
    );
  };

  const selected = document.objects.find(({ id }) => id === selectedId);
  const box = selected ? selectionBox(selected) : null;
  const viewWidth = 1000 / zoom;
  const viewHeight = 700 / zoom;

  return (
    <svg
      aria-label="Whiteboard canvas"
      className={`whiteboard-canvas whiteboard-canvas--${tool}`}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="img"
      viewBox={`${pan.x} ${pan.y} ${viewWidth} ${viewHeight}`}
    >
      <defs>
        <marker
          id="whiteboard-arrowhead"
          markerHeight="8"
          markerWidth="8"
          orient="auto-start-reverse"
          refX="7"
          refY="4"
        >
          <path d="M0,0 L8,4 L0,8 z" fill="context-stroke" />
        </marker>
      </defs>
      <rect
        className="whiteboard-canvas__background"
        height="1400"
        width="2000"
        x="-500"
        y="-350"
      />
      {[...document.objects]
        .sort((left, right) => Number(right.background) - Number(left.background))
        .map((object) => renderObject(object))}
      {draftObject ? renderObject(draftObject, true) : null}
      {box ? (
        <g aria-label="Selection handles" className="whiteboard-selection-box">
          <rect fill="none" height={box.height} width={box.width} x={box.x} y={box.y} />
          <circle
            aria-label="Resize selected object"
            cx={box.x + box.width}
            cy={box.y + box.height}
            onPointerDown={(event) => onResizePointerDown(event, selected)}
            r="8"
            role="button"
          />
        </g>
      ) : null}
    </svg>
  );
}
