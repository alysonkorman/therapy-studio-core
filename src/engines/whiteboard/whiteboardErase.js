const MIN_FRAGMENT_LENGTH = 10;

function distance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return distance(point, start);
  const ratio = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)
  );
  return distance(point, { x: start.x + dx * ratio, y: start.y + dy * ratio });
}

function isErased(point, eraserPoints, radius) {
  return eraserPoints.some((eraserPoint) => distance(point, eraserPoint) <= radius);
}

function sampleStroke(points, step) {
  const samples = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const length = distance(start, end);
    const count = Math.max(1, Math.ceil(length / step));
    for (let segment = 1; segment <= count; segment += 1) {
      const ratio = segment / count;
      samples.push({
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      });
    }
  }
  return samples;
}

function fragmentLength(points) {
  return points
    .slice(1)
    .reduce((total, point, index) => total + distance(point, points[index]), 0);
}

function stableSuffix(eraserPoints) {
  let value = 2166136261;
  for (const point of eraserPoints) {
    const source = `${Math.round(point.x)}:${Math.round(point.y)};`;
    for (const character of source)
      value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  }
  return (value >>> 0).toString(36);
}

export function splitStrokeByEraser(stroke, eraserPoints, radius) {
  const effectiveRadius = radius + stroke.width / 2;
  const samples = sampleStroke(stroke.points, Math.max(2, Math.min(6, radius / 2)));
  const fragments = [];
  let current = [];
  let removed = false;

  for (const point of samples) {
    if (isErased(point, eraserPoints, effectiveRadius)) {
      removed = true;
      if (current.length > 1 && fragmentLength(current) >= MIN_FRAGMENT_LENGTH) {
        fragments.push(current);
      }
      current = [];
    } else {
      current.push(point);
    }
  }
  if (current.length > 1 && fragmentLength(current) >= MIN_FRAGMENT_LENGTH)
    fragments.push(current);

  if (!removed) return [stroke];
  const suffix = stableSuffix(eraserPoints);
  return fragments.map((points, index) => ({
    ...stroke,
    id: `${stroke.id}~erase-${suffix}-${index}`,
    points,
  }));
}

function objectHit(object, point, radius) {
  if (object.kind === "stroke") {
    return object.points
      .slice(1)
      .some((end, index) =>
        eraserPointsHitSegment(
          point,
          object.points[index],
          end,
          radius + object.width / 2
        )
      );
  }
  if (object.kind === "arrow")
    return (
      distanceToSegment(
        point,
        { x: object.x1, y: object.y1 },
        { x: object.x2, y: object.y2 }
      ) <=
      radius + object.strokeWidth / 2
    );
  if (object.kind === "text")
    return (
      point.x >= object.x - radius &&
      point.x <= object.x + 220 + radius &&
      point.y >= object.y - object.size - radius &&
      point.y <= object.y + radius
    );
  const width = object.width ?? 0;
  const height = object.height ?? 0;
  return (
    point.x >= object.x - radius &&
    point.x <= object.x + width + radius &&
    point.y >= object.y - radius &&
    point.y <= object.y + height + radius
  );
}

function eraserPointsHitSegment(point, start, end, radius) {
  return distanceToSegment(point, start, end) <= radius;
}

export function eraseWhiteboardObjects(objects, eraserPoints, radius) {
  const before = [];
  const after = [];
  const nextObjects = [];

  for (const object of objects) {
    if (
      object.locked ||
      !eraserPoints.some((point) => objectHit(object, point, radius))
    ) {
      nextObjects.push(object);
      continue;
    }
    before.push(object);
    if (object.kind === "stroke") {
      const fragments = splitStrokeByEraser(object, eraserPoints, radius);
      if (fragments.length === 1 && fragments[0] === object) {
        nextObjects.push(object);
        before.pop();
        continue;
      }
      nextObjects.push(...fragments);
      after.push(...fragments);
    }
  }

  return { after, before, objects: nextObjects };
}

export function clearWhiteboardObjects(objects) {
  return { after: [], before: objects, objects: [] };
}
