// Help for the whole app (home page and designer): the guided tour running
// now and its step, the Quick guide popup, the designer's tips (closed
// "what is this" lines, the first-time tip on show), and the designer's Help
// panel (This item / Guides / All elements) with the settings
// explanations open in the Properties panel. Drawn once in App.vue
// (GuidedTour, HelpModal); the Help menus and the pages start them.
import { defineStore } from "pinia";
import { ref } from "vue";
import {
  availableSteps,
  FIRST_TIPS_KEY,
  hasSeenTour,
  markTourSeen,
  PANEL_TIPS_KEY,
  readHelpList,
  writeHelpList,
  type FirstTipId,
  type TourId,
  type TourStep,
} from "@/utils/helpTours";
import type { GuideAction, GuideId } from "@/utils/helpGuides";
import type { DocPageId } from "@/utils/helpDocs";

export type HelpPanelTab = "item" | "guides" | "elements";

export type GuideTab = "guide" | "shortcuts";

export const useHelpStore = defineStore("help", () => {
  // Tutorial mode (Help menu switch, on for new users): the help that comes
  // by itself, i.e. tours on a first visit, first-time tips, the "what is
  // this" line in Properties and the hover cards on tiles and tools. Off, only
  // help the user asks for is shown (Help menu, Help window, (i), Learn more).
  // Turned back on, the tips closed or already seen come back.
  const TUTORIAL_KEY = "help.tutorialMode";
  const tutorialMode = ref(readTutorialMode());
  function readTutorialMode(): boolean {
    try {
      return localStorage.getItem(TUTORIAL_KEY) !== "off";
    } catch {
      return true;
    }
  }
  function setTutorialMode(on: boolean) {
    tutorialMode.value = on;
    try {
      localStorage.setItem(TUTORIAL_KEY, on ? "on" : "off");
    } catch {
      // Storage blocked: the switch is back on next time
    }
    if (on) showTipsAgain();
    else {
      endTour();
      firstTip.value = null;
    }
  }

  const tourId = ref<TourId | null>(null);
  const steps = ref<TourStep[]>([]);
  const stepIndex = ref(0);
  const guideOpen = ref(false);
  const guideTab = ref<GuideTab>("guide");
  // The page the guide was opened from: its "Take the tour" runs that tour
  const guideTour = ref<TourId>("home");

  // Seen as soon as it starts, so closing the window halfway never brings it back
  function startTour(id: TourId) {
    guideOpen.value = false;
    panelOpen.value = false;
    firstTip.value = null;
    const shown = availableSteps(id);
    if (!shown.length) return;
    tourId.value = id;
    steps.value = shown;
    stepIndex.value = 0;
    markTourSeen(id);
  }

  // The first visit to a page: its tour, once per browser
  function startTourOnce(id: TourId) {
    if (!tutorialMode.value || tourId.value || guideOpen.value || hasSeenTour(id)) return;
    startTour(id);
  }

  function nextStep() {
    if (stepIndex.value < steps.value.length - 1) stepIndex.value++;
    else endTour();
  }

  function previousStep() {
    if (stepIndex.value > 0) stepIndex.value--;
  }

  function endTour() {
    tourId.value = null;
    steps.value = [];
    stepIndex.value = 0;
  }

  function openGuide(from: TourId, tab: GuideTab = "guide") {
    endTour();
    guideTour.value = from;
    guideTab.value = tab;
    guideOpen.value = true;
  }

  function closeGuide() {
    guideOpen.value = false;
  }

  // "What is this" lines at the top of the Properties panel, closed per kind
  const hiddenPanelTips = ref<string[]>(readHelpList(PANEL_TIPS_KEY));

  function hidePanelTip(kind: string) {
    if (hiddenPanelTips.value.includes(kind)) return;
    hiddenPanelTips.value = [...hiddenPanelTips.value, kind];
    writeHelpList(PANEL_TIPS_KEY, hiddenPanelTips.value);
  }

  // The first-time tip on show: each once per browser, never during a tour
  const firstTip = ref<FirstTipId | null>(null);
  const seenFirstTips = ref<string[]>(readHelpList(FIRST_TIPS_KEY));

  // The first of these not seen yet; true when one is shown
  function showFirstTip(ids: FirstTipId[]): boolean {
    if (!tutorialMode.value || tourId.value || guideOpen.value || panelOpen.value) return false;
    const id = ids.find((tip) => !seenFirstTips.value.includes(tip));
    if (!id) return false;
    firstTip.value = id;
    seenFirstTips.value = [...seenFirstTips.value, id];
    writeHelpList(FIRST_TIPS_KEY, seenFirstTips.value);
    return true;
  }

  function closeFirstTip() {
    firstTip.value = null;
  }

  // Tutorial mode turned back on: every tip shows again
  function showTipsAgain() {
    hiddenPanelTips.value = [];
    seenFirstTips.value = [];
    writeHelpList(PANEL_TIPS_KEY, []);
    writeHelpList(FIRST_TIPS_KEY, []);
  }

  // The Help panel (designer): its tab; on This item, the selected element's
  // page; on All elements, the page open (none: the list); on Guides,
  // the guide open (none: the list)
  const panelOpen = ref(false);
  const panelMinimized = ref(false);
  const panelTab = ref<HelpPanelTab>("item");
  const docPage = ref<DocPageId | null>(null);
  const guideId = ref<GuideId | null>(null);

  // Where the user dragged the Help window (its top left corner) and the size
  // they gave it, kept in this browser; none: its first place beside the
  // Properties panel, and its own size
  const POS_KEY = "designer.helpWindowPos";
  const SIZE_KEY = "designer.helpWindowSize";
  const readPair = <K extends string>(key: string, a: K, b: K): Record<K, number> | null => {
    try {
      const value = JSON.parse(localStorage.getItem(key) ?? "null");
      return value && Number.isFinite(value[a]) && Number.isFinite(value[b]) ? value : null;
    } catch {
      return null;
    }
  };
  const writePair = (key: string, value: object) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage blocked: the window opens in its first place and size next time
    }
  };
  const panelPos = ref<{ x: number; y: number } | null>(readPair(POS_KEY, "x", "y"));
  const panelSize = ref<{ width: number; height: number } | null>(readPair(SIZE_KEY, "width", "height"));
  function setPanelPos(pos: { x: number; y: number }) {
    panelPos.value = pos;
    writePair(POS_KEY, pos);
  }
  function setPanelSize(size: { width: number; height: number }) {
    panelSize.value = size;
    writePair(SIZE_KEY, size);
  }

  function openPanel(tab: HelpPanelTab, page: { guide?: GuideId; doc?: DocPageId } = {}) {
    endTour();
    firstTip.value = null;
    panelOpen.value = true;
    panelMinimized.value = false;
    panelTab.value = tab;
    if (tab === "guides") guideId.value = page.guide ?? null;
    if (tab === "elements") docPage.value = page.doc ?? null;
  }

  function closePanel() {
    panelOpen.value = false;
    guideId.value = null;
    docPage.value = null;
  }

  // Guides: what was done in this designer visit that the report
  // doesn't record, and steps ticked once seen (`<guide>.<step>`)
  const guideActions = ref<GuideAction[]>([]);
  const stickySteps = ref<string[]>([]);

  function noteGuideAction(action: GuideAction) {
    if (!guideActions.value.includes(action)) guideActions.value = [...guideActions.value, action];
  }

  function tickSticky(key: string) {
    if (!stickySteps.value.includes(key)) stickySteps.value = [...stickySteps.value, key];
  }

  // A fresh designer: a fresh report, so nothing done yet
  function resetGuides() {
    closePanel();
    guideActions.value = [];
    stickySteps.value = [];
  }

  // A question for the AI assistant, put in its message box (not sent) by the chat
  const aiDraft = ref("");

  // Settings explanations open in the Properties panel (the (i) next to a card's title)
  const openSettings = ref<string[]>([]);

  function toggleSetting(id: string) {
    openSettings.value = openSettings.value.includes(id)
      ? openSettings.value.filter((open) => open !== id)
      : [...openSettings.value, id];
  }

  return {
    tutorialMode,
    setTutorialMode,
    tourId,
    steps,
    stepIndex,
    guideOpen,
    guideTab,
    guideTour,
    startTour,
    startTourOnce,
    nextStep,
    previousStep,
    endTour,
    openGuide,
    closeGuide,
    hiddenPanelTips,
    hidePanelTip,
    firstTip,
    showFirstTip,
    closeFirstTip,
    showTipsAgain,
    panelOpen,
    panelMinimized,
    panelTab,
    docPage,
    panelPos,
    setPanelPos,
    panelSize,
    setPanelSize,
    guideId,
    guideActions,
    stickySteps,
    openPanel,
    closePanel,
    noteGuideAction,
    tickSticky,
    resetGuides,
    aiDraft,
    openSettings,
    toggleSetting,
  };
});
