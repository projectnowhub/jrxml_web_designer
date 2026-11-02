// Scrolling the pages while something is dragged over them: the pages scroll by
// themselves while the pointer is near (or past) the top / bottom / left / right
// edge of the page area, faster the closer it gets, and the mouse wheel scrolls
// them as usual. `offset()` is how far the pages scrolled since the drag began,
// so a drag can keep its element under the pointer; `onScroll` runs whenever
// they scroll (the pointer didn't move, but what lies under it did).

// The scrolling area holding the page sheets (DesignerCanvas.vue)
const PAGE_AREA_SELECTOR = ".paper-container";
// How deep the edge zone reaches into the page area, in screen pixels
const EDGE_ZONE = 48;
// Fastest scroll, in screen pixels per frame (reached at the edge and past it)
const MAX_SPEED = 22;
// Drags the browser runs itself (library tiles, Report Data, files) stop
// scrolling this far past the edge: further out the pointer is over the app's
// own bars, not pushing at the pages
const NATIVE_REACH_OUTSIDE = 80;
// Those drags send dragover about every 50 ms, even when the pointer rests;
// none for this long means the drag ended somewhere we didn't hear about
const NATIVE_IDLE_MS = 350;

export interface DragScrollSession {
  // How far the pages scrolled since the drag began (screen pixels)
  offset: () => { x: number; y: number };
  // The pointer moved (mousemove or dragover position)
  pointer: (clientX: number, clientY: number) => void;
  stop: () => void;
}

interface DragScrollOptions {
  onScroll?: () => void;
  // A drag the browser runs itself (HTML drag and drop)
  native?: boolean;
}

// Speed for a pointer `inside` px within the edge zone (negative = past the edge)
const edgeSpeed = (inside: number, reachOutside: number): number => {
  if (inside >= EDGE_ZONE) return 0;
  if (inside < -reachOutside) return 0;
  if (inside <= 0) return MAX_SPEED;
  const closeness = 1 - inside / EDGE_ZONE;
  return Math.max(1, Math.round(closeness * closeness * MAX_SPEED));
};

// One axis: negative scrolls back (up / left), positive forward
const axisSpeed = (
  position: number,
  start: number,
  end: number,
  reachOutside: number,
): number => {
  const back = edgeSpeed(position - start, reachOutside);
  if (back) return -back;
  return edgeSpeed(end - position, reachOutside);
};

export function startDragScrolling(options: DragScrollOptions = {}): DragScrollSession {
  const area = document.querySelector<HTMLElement>(PAGE_AREA_SELECTOR);
  const startLeft = area?.scrollLeft ?? 0;
  const startTop = area?.scrollTop ?? 0;
  const reachOutside = options.native ? NATIVE_REACH_OUTSIDE : Infinity;
  let pointerX: number | null = null;
  let pointerY: number | null = null;
  let lastPointerAt = 0;
  let frame = 0;
  let stopped = false;

  const handleScroll = () => options.onScroll?.();
  area?.addEventListener("scroll", handleScroll, { passive: true });

  const step = () => {
    frame = 0;
    if (stopped || !area || pointerX === null || pointerY === null) return;
    if (options.native && performance.now() - lastPointerAt > NATIVE_IDLE_MS) return;
    const rect = area.getBoundingClientRect();
    // Scroll up / down only while the pointer is over the area's width (and
    // sideways only over its height), so a drag along the library or the
    // panels never scrolls the pages
    const overWidth = pointerX >= rect.left && pointerX <= rect.right;
    const overHeight = pointerY >= rect.top && pointerY <= rect.bottom;
    const dy = overWidth ? axisSpeed(pointerY, rect.top, rect.bottom, reachOutside) : 0;
    const dx = overHeight ? axisSpeed(pointerX, rect.left, rect.right, reachOutside) : 0;
    if (!dx && !dy) return;
    const beforeLeft = area.scrollLeft;
    const beforeTop = area.scrollTop;
    area.scrollBy(dx, dy);
    // At the end of the pages nothing moves: wait for the pointer
    if (area.scrollLeft === beforeLeft && area.scrollTop === beforeTop) return;
    frame = requestAnimationFrame(step);
  };

  return {
    offset: () => ({
      x: (area?.scrollLeft ?? startLeft) - startLeft,
      y: (area?.scrollTop ?? startTop) - startTop,
    }),
    pointer: (clientX, clientY) => {
      if (stopped) return;
      pointerX = clientX;
      pointerY = clientY;
      lastPointerAt = performance.now();
      if (!frame) frame = requestAnimationFrame(step);
    },
    stop: () => {
      stopped = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      area?.removeEventListener("scroll", handleScroll);
    },
  };
}
