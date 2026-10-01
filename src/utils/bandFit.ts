// Where an element dropped into a band ends up, given the band's height and the
// most it may grow to (its maximum height setting, and the room left on the page).
export type BandFitPlan =
  // Fits as is, or after moving up so its bottom is inside the band
  | { kind: "fits"; y: number }
  // Fits once the band grows to `bandHeight` (never past its maximum)
  | { kind: "grow"; y: number; bandHeight: number }
  // Taller than the band can ever be: the drop is refused
  | { kind: "tooTall"; maxHeight: number };

export function planBandFit(
  element: { y: number; height: number },
  bandHeight: number,
  maxBandHeight: number,
): BandFitPlan {
  const y = Math.max(0, Math.round(element.y));
  const height = element.height;
  if (y + height <= bandHeight) return { kind: "fits", y };
  if (height <= bandHeight) return { kind: "fits", y: bandHeight - height };

  const maxHeight = Math.max(bandHeight, maxBandHeight);
  if (height > maxHeight) return { kind: "tooTall", maxHeight };
  // Grow only as much as needed, keeping the drop position where it can
  const grownHeight = Math.min(maxHeight, y + height);
  return { kind: "grow", y: grownHeight - height, bandHeight: grownHeight };
}
