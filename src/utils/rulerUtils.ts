import { RULER_CONSTANTS, UI_CONSTANTS } from "@/constants/constants";
import { fitGridStep, gridLine } from "@/utils/snapping";

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
 * SVG path for the canvas grid inside a band: whole squares of about GRID_SIZE
 * from the band's top-left, stretched so a line falls on the right and bottom
 * edges too (`fitGridStep`), on whole pixels: the lines snap-to-grid uses.
 * `strokeWidth` is the line width in band units (1 / zoom for one screen
 * pixel); each line covers [line, line + strokeWidth], the one on the right
 * edge [width - strokeWidth, width] so it stays inside the band. The bottom
 * edge is left to the next band's top line (or the margin outline).
 */
export function buildGridPath(
  width: number,
  height: number,
  strokeWidth: number,
): string {
  const { x: stepX, y: stepY } = sectionGridStep(width, height);
  const columns = Math.round(width / stepX);
  const rows = Math.round(height / stepY);
  const half = strokeWidth / 2;
  const parts: string[] = [];
  for (let i = 0; i <= columns; i++) {
    const x = i === columns ? width - half : gridLine(i, stepX) + half;
    parts.push(`M${x} 0V${height}`);
  }
  for (let i = 0; i < rows; i++) {
    parts.push(`M0 ${gridLine(i, stepY) + half}H${width}`);
  }
  return parts.join("");
}

/** The grid step of a section `width` × `height` (as `buildGridPath` draws it) */
export function sectionGridStep(width: number, height: number): { x: number; y: number } {
  return {
    x: fitGridStep(width, UI_CONSTANTS.GRID_SIZE),
    y: fitGridStep(height, UI_CONSTANTS.GRID_SIZE),
  };
}
