// Snapping for drag, resize, drop and nudge on the designer canvas.
//
// All values are in one container's coordinates: a band, or a box (frame) for
// items inside one. Alignment to other elements wins over the grid: an edge or
// centre within `threshold` of a target lands exactly on it; otherwise the
// position goes to the nearest grid line. The grid is drawn per band, so a box's
// items snap to it in band coordinates (`gridOffset` = the box's position).

export interface SnapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Lines other things can be aligned to: x values (vertical lines) and y values
export interface SnapTargets {
  x: number[];
  y: number[];
}

export interface SnapOptions {
  // Grid step, or null when Snap to Grid is off
  grid: number | null;
  // Alignment distance in container units, or null when Snap to Alignment is off
  threshold: number | null;
  gridOffsetX?: number;
  gridOffsetY?: number;
}

// Target lines the result lies on, for drawing guides
export interface SnapGuides {
  x: number[];
  y: number[];
}

// Same position, within rounding
const ON_LINE = 0.5;

export function snapToGrid(value: number, grid: number, offset = 0): number {
  return Math.round((value + offset) / grid) * grid - offset;
}

// The shift that puts the closest of `points` on a target, if one is close enough
function closestShift(
  points: number[],
  targets: number[],
  threshold: number,
): number | null {
  let best: number | null = null;
  for (const point of points) {
    for (const target of targets) {
      const shift = target - point;
      if (Math.abs(shift) <= threshold && (best === null || Math.abs(shift) < Math.abs(best))) {
        best = shift;
      }
    }
  }
  return best;
}

function linesOn(points: number[], targets: number[]): number[] {
  const lines = targets.filter((t) => points.some((p) => Math.abs(p - t) <= ON_LINE));
  return [...new Set(lines)];
}

// Snap a start position along one axis; `size` 0 snaps a single point
function snapAxis(
  start: number,
  size: number,
  targets: number[],
  grid: number | null,
  threshold: number | null,
  gridOffset: number,
): { start: number; lines: number[] } {
  const points = (s: number) => (size > 0 ? [s, s + size / 2, s + size] : [s]);
  let snapped = start;
  const shift = threshold !== null ? closestShift(points(start), targets, threshold) : null;
  if (shift !== null) {
    snapped = start + shift;
  } else if (grid) {
    snapped = snapToGrid(start, grid, gridOffset);
  }
  snapped = Math.round(snapped);
  return { start: snapped, lines: threshold !== null ? linesOn(points(snapped), targets) : [] };
}

// Moving a whole element: its left/centre/right and top/middle/bottom can align
export function snapMove(
  rect: SnapRect,
  targets: SnapTargets,
  options: SnapOptions,
): { x: number; y: number; guides: SnapGuides } {
  const x = snapAxis(rect.x, rect.width, targets.x, options.grid, options.threshold, options.gridOffsetX ?? 0);
  const y = snapAxis(rect.y, rect.height, targets.y, options.grid, options.threshold, options.gridOffsetY ?? 0);
  return { x: x.start, y: y.start, guides: { x: x.lines, y: y.lines } };
}

// One edge (resize) or one point (line end), along one axis
export function snapEdge(
  value: number,
  targets: number[],
  options: SnapOptions,
  axis: "x" | "y",
): { value: number; lines: number[] } {
  const offset = (axis === "x" ? options.gridOffsetX : options.gridOffsetY) ?? 0;
  const result = snapAxis(value, 0, targets, options.grid, options.threshold, offset);
  return { value: result.start, lines: result.lines };
}

// Shift+Arrow with Snap to Grid on: the next grid line in that direction
export function nextGridLine(value: number, grid: number, direction: 1 | -1, offset = 0): number {
  const position = value + offset;
  const line =
    direction > 0
      ? Math.floor(position / grid + 1e-9) * grid + grid
      : Math.ceil(position / grid - 1e-9) * grid - grid;
  return line - offset;
}

// Target lines from a container's edges and centre plus each element's edges and centre
export function collectSnapTargets(
  container: { width: number; height: number },
  rects: SnapRect[],
): SnapTargets {
  const x = [0, container.width / 2, container.width];
  const y = [0, container.height / 2, container.height];
  for (const r of rects) {
    x.push(r.x, r.x + r.width / 2, r.x + r.width);
    y.push(r.y, r.y + r.height / 2, r.y + r.height);
  }
  return { x: [...new Set(x)], y: [...new Set(y)] };
}
