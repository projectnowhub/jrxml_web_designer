import { RULER_CONSTANTS, UI_CONSTANTS } from "@/constants/constants";

export interface RulerTick {
  position: number;
  major: boolean;
}

export interface RulerLabel {
  position: number;
  value: string;
}

/**
 * Ruler ticks and labels for one page along one axis.
 *
 * `position` is measured from the paper edge (where the mark is drawn), but the
 * numbers count from the start margin: element X/Y are relative to the band,
 * which starts at the margin, so the ruler reads the same as the X/Y fields.
 * Ticks continue into the margins; labels cover the printable area only.
 */
export function buildRulerMarks(
  pageLength: number,
  startMargin: number,
  endMargin: number,
  offset = 0,
): { ticks: RulerTick[]; labels: RulerLabel[] } {
  const { UNIT_SIZE, MAJOR_TICK_INTERVAL, LABEL_INTERVAL } = RULER_CONSTANTS;
  const start = Math.max(0, startMargin || 0);
  const printable = pageLength - start - Math.max(0, endMargin || 0);

  const ticks: RulerTick[] = [];
  for (
    let value = -Math.floor(start / UNIT_SIZE) * UNIT_SIZE;
    start + value <= pageLength;
    value += UNIT_SIZE
  ) {
    ticks.push({
      position: offset + start + value,
      major: Math.abs(value) % MAJOR_TICK_INTERVAL === 0,
    });
  }

  const labels: RulerLabel[] = [];
  for (let value = 0; value <= printable; value += LABEL_INTERVAL) {
    labels.push({ position: offset + start + value, value: String(value) });
  }

  return { ticks, labels };
}

/**
 * SVG path for the canvas grid inside a band: one line every GRID_SIZE from the
 * band's top-left, the same origin snap-to-grid rounds to. `strokeWidth` is the
 * line width in band units (1 / zoom for one screen pixel); each line is shifted
 * half of it so it covers [n * GRID_SIZE, n * GRID_SIZE + strokeWidth].
 */
export function buildGridPath(
  width: number,
  height: number,
  strokeWidth: number,
): string {
  const grid = UI_CONSTANTS.GRID_SIZE;
  const half = strokeWidth / 2;
  const parts: string[] = [];
  for (let x = 0; x < width; x += grid) {
    parts.push(`M${x + half} 0V${height}`);
  }
  for (let y = 0; y < height; y += grid) {
    parts.push(`M0 ${y + half}H${width}`);
  }
  return parts.join("");
}
