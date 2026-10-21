// The guided tours: a few steps that point at parts of the screen, each with
// one plain sentence (texts in help.tours.<tour>.<key>Title / <key>Text).
// A tour starts by itself the first time its page is opened (remembered per
// browser) and again from the Help menu.
//
// Also the designer's tips: the one-line "what is this" at the top of the
// Properties panel (help.panelTips.<kind>, closed per kind) and the tips shown
// the first time something is selected (help.firstTips.<id>, once each).

export type TourId = "home" | "templates" | "designer";

export type TourSide = "top" | "bottom" | "left" | "right";

export interface TourStep {
  key: string;
  /** What the step points at (CSS selector); none = a card in the middle */
  target?: string;
  /** Where the card goes first, when there is room */
  side?: TourSide;
}

// First-time tips, by what was selected
export type FirstTipId = "select" | "text" | "box" | "typedTable" | "dataTable" | "chart";

export const TOURS: Record<TourId, TourStep[]> = {
  home: [
    { key: "welcome" },
    { key: "create", target: '[data-help="create-report"]', side: "right" },
    { key: "nav", target: '[data-help="nav"]', side: "right" },
    { key: "search", target: '[data-help="search"]', side: "bottom" },
    { key: "account", target: '[data-help="account"]', side: "bottom" },
    { key: "help", target: '[data-help="help"]', side: "bottom" },
  ],
  // My templates: the list, its two views, the order, a template's actions
  templates: [
    { key: "list", target: '[data-help="template-list"]', side: "top" },
    { key: "view", target: '[data-help="template-view"]', side: "bottom" },
    { key: "order", target: '[data-help="template-order"]', side: "bottom" },
    { key: "actions", target: '[data-help="template-actions"]', side: "left" },
    { key: "search", target: '[data-help="search"]', side: "bottom" },
  ],
  designer: [
    { key: "welcome" },
    { key: "projects", target: ".hpp-select", side: "bottom" },
    { key: "library", target: '[data-help="library"]', side: "right" },
    { key: "page", target: ".page-sheet-wrapper", side: "right" },
    { key: "panel", target: '[data-help="side-panel"]', side: "left" },
    { key: "pages", target: '[data-help="add-page"]', side: "bottom" },
    { key: "preview", target: '[data-help="preview"]', side: "bottom" },
    { key: "help", target: '[data-help="help"]', side: "bottom" },
  ],
};

/** The first matching element that is on screen */
export function findTourTarget(selector: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return el;
  }
  return null;
}

/** The tour's steps that can be shown now (a tool hidden on a narrow window is left out) */
export function availableSteps(id: TourId): TourStep[] {
  return TOURS[id].filter((step) => !step.target || findTourTarget(step.target));
}

// What each viewer has already seen or closed, kept in this browser
const SEEN_KEY = "help.toursSeen";
export const PANEL_TIPS_KEY = "help.hiddenPanelTips";
export const FIRST_TIPS_KEY = "help.tipsSeen";

export function readHelpList(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function writeHelpList(key: string, list: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Storage blocked: the tip or tour may show again next time
  }
}

export function hasSeenTour(id: TourId): boolean {
  return readHelpList(SEEN_KEY).includes(id);
}

export function markTourSeen(id: TourId): void {
  const seen = readHelpList(SEEN_KEY);
  if (!seen.includes(id)) writeHelpList(SEEN_KEY, [...seen, id]);
}
