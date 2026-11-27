import { stripExpressionQuotes } from "@/utils/elementUtils";

// Narrowest box "Fit to text" makes
const MIN_FIT_WIDTH = 10;

// Text whose content is fixed: a single string literal, no fields, parameters
// or variables (whose real values are only known when the report runs)
export function isStaticTextExpression(expression?: string): boolean {
  return /^"(?:[^"\\]|\\.)*"$/s.test((expression || "").trim());
}

// Text broken onto several lines on purpose (Enter, or paragraphs)
export function hasLineBreaks(expression?: string): boolean {
  const text = stripExpressionQuotes(expression || "");
  return /\\n|\n|<br\s*\/?>|<\/(p|div|li)>/i.test(text);
}

export interface TextFitElement {
  x: number;
  width: number;
  expression?: string;
  textAlignment?: string;
  rotation?: string;
}

/**
 * Position and width for "Fit to text" (the height is measured afterwards at
 * this width). Static text on one line gets the width of its text, keeping its
 * alignment edge in place: left-aligned keeps its left edge, right-aligned its
 * right edge, centred its centre. It never reaches past the container (band or
 * box); text longer than that wraps instead. Data fields, multi-line text and
 * sideways text keep their width: only their height is fitted.
 */
export function planTextFit(
  element: TextFitElement,
  naturalWidth: number,
  containerWidth: number,
): { x: number; width: number } {
  const sideways = element.rotation === "Left" || element.rotation === "Right";
  if (
    !isStaticTextExpression(element.expression) ||
    hasLineBreaks(element.expression) ||
    sideways
  ) {
    return { x: element.x, width: element.width };
  }

  const right = element.x + element.width;
  const centre = element.x + element.width / 2;
  const maxWidth =
    element.textAlignment === "Right"
      ? right
      : element.textAlignment === "Center"
        ? 2 * Math.min(centre, containerWidth - centre)
        : containerWidth - element.x;
  const width = Math.round(
    Math.max(MIN_FIT_WIDTH, Math.min(Math.ceil(naturalWidth), Math.max(MIN_FIT_WIDTH, maxWidth))),
  );

  const x =
    element.textAlignment === "Right"
      ? right - width
      : element.textAlignment === "Center"
        ? centre - width / 2
        : element.x;
  return { x: Math.max(0, Math.round(x)), width };
}
