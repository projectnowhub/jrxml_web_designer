import type { Band, DesignElement, FrameElement } from "@/types";
import { findPageBorder, fitChildrenToFrame } from "@/utils/framePresets";

export interface PageFitResult {
  // The page border was resized to the new printable area
  borderResized: boolean;
  // Number of elements moved (or narrowed) to fit
  moved: number;
}

// Resize a box, keeping its items in step (same rules as resizing it by hand)
function resizeBox(box: FrameElement, width: number, height: number) {
  const fitted = fitChildrenToFrame(
    box.elements ?? [],
    { width: box.width, height: box.height },
    { width, height },
  );
  box.elements?.forEach((child, i) => Object.assign(child, fitted[i]));
  box.width = width;
  box.height = height;
}

// Move an element inside the printable width and its band; narrow it only when
// it is wider than the page (tables keep their columns and are only moved)
function fitElement(el: DesignElement, width: number, bandHeight: number): boolean {
  const before = [el.x, el.y, el.width];
  if (el.width > width && el.type !== "table") {
    if (el.type === "frame") resizeBox(el as FrameElement, width, el.height);
    else el.width = width;
  }
  if (el.x + el.width > width) el.x = Math.max(0, width - el.width);
  if (el.height <= bandHeight && el.y + el.height > bandHeight) {
    el.y = bandHeight - el.height;
  }
  return before[0] !== el.x || before[1] !== el.y || before[2] !== el.width;
}

/**
 * After the paper size or margins change: the page border is resized to the new
 * printable area (keeping its style), and elements that no longer fit are moved
 * inside it. Nothing is deleted. Band heights must already fit the new page.
 */
export function fitContentToPage(
  bands: Band[],
  area: { width: number; height: number },
): PageFitResult {
  const width = Math.max(1, Math.round(area.width));
  const height = Math.max(1, Math.round(area.height));
  const border = findPageBorder(bands);
  let borderResized = false;
  let moved = 0;

  bands.forEach((band, bandIndex) => {
    // The Background band covers the printable area of every page
    if (band.type === "background") {
      band.height = border ? height : Math.min(band.height, height);
    }
    band.elements?.forEach((el, elementIndex) => {
      if (border?.bandIndex === bandIndex && border.elementIndex === elementIndex) {
        if (el.x !== 0 || el.y !== 0 || el.width !== width || el.height !== height) {
          el.x = 0;
          el.y = 0;
          resizeBox(el as FrameElement, width, height);
          borderResized = true;
        }
        return;
      }
      if (fitElement(el, width, band.height)) moved++;
    });
  });

  return { borderResized, moved };
}
