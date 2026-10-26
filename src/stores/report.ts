// The report being designed: its JSON model (page settings, bands and their
// elements, fields, parameters, datasets, saved table styles, variables,
// groups), the JRXML written from it, and undo/redo over the model.
//
// One designer at a time uses it: the designer calls reset() when it opens,
// so each visit starts from a new report, as before the store existed.
//
// Panels and the canvas change the model directly and call
// saveStateToHistory() BEFORE a change (one undo step per user action) and
// updateJrxml() after it.
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import type { Band, BandType, ReportField, ReportParameter, ReportProperties, TableDataset } from "@/types";
import type { SavedTableStyle } from "@/types/dataSource";
import { useUndoRedo } from "@/composables/useUndoRedo";
import { generateJRXMLContent } from "@/utils/jrxmlGenerator";
import { ensureUniqueUuids } from "@/utils/elementUtils";
import { resetBoxPhotos } from "@/utils/framePresets";
import { cleanLegacyAutoDate } from "@/utils/autoDate";
import { ensureUniqueTableDatasets } from "@/utils/table/tableDocument";
import { specialPages } from "@/utils/specialPages";
import { fitContentsPages, fitListDecorations, NEW_REPORT_HEADING_NUMBERING, syncHeadings } from "@/utils/headingSync";
import { unwrapLegacyCoverFrames } from "@/utils/pageDesigns";
import { syncLocations } from "@/utils/location/locationElement";
import { syncTotals } from "@/utils/customTable";
import { loadReportDefaults } from "@/utils/reportDefaults";
import { useEditorStore } from "./editor";
import { useSelectionStore } from "./selection";
import { useFilesStore } from "./files";
import {
  ALL_CONFIGURABLE_BANDS,
  BAND_CONSTANTS,
  BAND_HEIGHT_CONSTANTS,
  BAND_TYPE_CONSTANTS,
  FONT_CONSTANTS,
  HISTORY_CONSTANTS,
  REPORT_CONSTANTS,
  getEffectiveDefaultBandConfig,
  getEffectiveDefaultBandLimits,
} from "@/constants/constants";

// What undo/redo restores: the whole report
export interface ReportSnapshot {
  reportProperties: ReportProperties;
  bands: Band[];
  pageCount: number;
  reportFields: ReportField[];
  reportParameters: ReportParameter[];
  subDatasets: TableDataset[];
  tableStyles: SavedTableStyle[];
  reportVariables: any[];
  reportGroups: any[];
}

// A report as it is opened (a saved file, browser storage, imported JRXML);
// anything missing gets its new-report value
export interface ReportData {
  reportProperties?: Partial<ReportProperties> | null;
  bands?: Band[] | null;
  pageCount?: number | null;
  reportFields?: ReportField[] | null;
  reportParameters?: ReportParameter[] | null;
  subDatasets?: TableDataset[] | null;
  tableStyles?: SavedTableStyle[] | null;
  reportVariables?: any[] | null;
  reportGroups?: any[] | null;
  jrxmlContent?: string | null;
}

// A new report: the paper, margins and font of Default Settings (kept in this
// browser, utils/reportDefaults.ts)
function newReportProperties(): ReportProperties {
  const defaults = loadReportDefaults();
  return {
    name: "NewReport",
    pageWidth: defaults.pageWidth,
    pageHeight: defaults.pageHeight,
    leftMargin: defaults.leftMargin,
    rightMargin: defaults.rightMargin,
    topMargin: defaults.topMargin,
    bottomMargin: defaults.bottomMargin,
    defaultFont: { ...defaults.font },
    bandLimits: getEffectiveDefaultBandLimits(),
    headingNumbers: { ...NEW_REPORT_HEADING_NUMBERING },
  };
}

// The bands of a new report: the parts chosen in Default Settings, at the
// user's default heights; Detail takes the rest of the default page
function newBands(): Band[] {
  const defaults = loadReportDefaults();
  const config = getEffectiveDefaultBandConfig();
  const height = (type: string) =>
    config[type]?.defaultHeight ?? (BAND_HEIGHT_CONSTANTS[type as keyof typeof BAND_HEIGHT_CONSTANTS] || 0);
  const others = defaults.bandTypes.filter(
    (type) => type !== BAND_TYPE_CONSTANTS.DETAIL && type !== BAND_TYPE_CONSTANTS.BACKGROUND,
  );
  const printable = defaults.pageHeight - defaults.topMargin - defaults.bottomMargin;
  const detail = Math.max(50, printable - others.reduce((sum, type) => sum + height(type), 0));
  return defaults.bandTypes.map((type) => ({
    type,
    height: type === BAND_TYPE_CONSTANTS.DETAIL ? detail : height(type),
    elements: [],
  }));
}

export const useReportStore = defineStore("report", () => {
  // The JRXML written from the model (shown, validated and saved)
  const jrxmlContent = ref("");
  const reportProperties = ref<ReportProperties>(newReportProperties());
  const bands = ref<Band[]>(newBands());
  // Designer pages (Detail bands separated by page breaks)
  const pageCount = ref(1);
  const reportFields = ref<ReportField[]>([]);
  const reportParameters = ref<ReportParameter[]>([]);
  const subDatasets = ref<TableDataset[]>([]);
  // Table styles the user saved in this report (built-in ones are not listed)
  const tableStyles = ref<SavedTableStyle[]>([]);
  const reportVariables = ref<any[]>([]);
  const reportGroups = ref<any[]>([]);

  // Page size, and how many designer pages there are (the last page that has
  // Detail content, or more when pages were added)
  const paperWidth = computed(() => reportProperties.value?.pageWidth || REPORT_CONSTANTS.DEFAULT_PAGE_WIDTH);
  const paperHeight = computed(() => reportProperties.value?.pageHeight || REPORT_CONSTANTS.DEFAULT_PAGE_HEIGHT);
  // The cover and contents pages at the front (utils/specialPages.ts)
  const special = computed(() => specialPages(reportProperties.value));
  const totalPages = computed(() => {
    const detail = bands.value.find((b) => b.type === BAND_TYPE_CONSTANTS.DETAIL);
    const lastPage = Math.max(0, ...(detail?.elements ?? []).map((e: any) => e.pageIndex || 0));
    // Always one normal page after the special ones
    return Math.max(pageCount.value, lastPage + 1, special.value.count + 1);
  });
  // Height of the printable area (the whole page inside the margins)
  const printableHeight = computed(
    () => paperHeight.value - (reportProperties.value?.topMargin || 0) - (reportProperties.value?.bottomMargin || 0),
  );

  // Undo/redo snapshots the whole model. Every change records a step BEFORE
  // changing anything (saveStateToHistory); one user action = one step.
  const history = useUndoRedo<ReportSnapshot>({
    maxHistorySize: HISTORY_CONSTANTS.MAX_HISTORY_SIZE,
    getState: () => ({
      reportProperties: reportProperties.value,
      bands: bands.value,
      pageCount: pageCount.value,
      reportFields: reportFields.value,
      reportParameters: reportParameters.value,
      subDatasets: subDatasets.value,
      tableStyles: tableStyles.value,
      reportVariables: reportVariables.value,
      reportGroups: reportGroups.value,
    }),
    applyState: (state) => {
      reportProperties.value = state.reportProperties;
      bands.value = state.bands;
      pageCount.value = state.pageCount;
      reportFields.value = state.reportFields;
      reportParameters.value = state.reportParameters;
      subDatasets.value = state.subDatasets;
      tableStyles.value = state.tableStyles;
      reportVariables.value = state.reportVariables;
      reportGroups.value = state.reportGroups;
    },
  });

  // Detail takes the page height the other bands leave (Background is drawn
  // under them and doesn't count)
  function fitBandsToPage() {
    const p = reportProperties.value;
    const available = paperHeight.value - (p?.topMargin || 0) - (p?.bottomMargin || 0);
    const detail = bands.value.find((b) => b.type === BAND_TYPE_CONSTANTS.DETAIL);
    if (!detail) return;
    const others = bands.value
      .filter((b) => b !== detail && b.type !== BAND_TYPE_CONSTANTS.BACKGROUND)
      .reduce((sum, b) => sum + (b.height || 0), 0);
    detail.height = Math.max(BAND_CONSTANTS.MIN_HEIGHT, available - others);
  }

  // Page size, margins or the other bands' heights changed: Detail follows
  watch(
    [
      paperHeight,
      () => reportProperties.value?.topMargin,
      () => reportProperties.value?.bottomMargin,
      () =>
        bands.value
          .filter((b) => b.type !== BAND_TYPE_CONSTANTS.DETAIL && b.type !== BAND_TYPE_CONSTANTS.BACKGROUND)
          .map((b) => b.height)
          .join(","),
    ],
    fitBandsToPage,
  );

  // Bumped each time updateJrxml() writes a different JRXML: the designer
  // auto-saves on it (loading a file sets jrxmlContent without bumping it)
  const jrxmlVersion = ref(0);
  let writing = false;
  const isWritingJrxml = () => writing;

  // Rewrite the JRXML after a change (the bands are fitted to the page first)
  function updateJrxml() {
    if (writing) return;
    writing = true;
    try {
      if (!reportProperties.value || !bands.value || !reportFields.value || !reportParameters.value) return;
      fitBandsToPage();
      // Headings renumbered, contents lists that follow them rebuilt (part of
      // the change being written, so the same undo step)
      syncHeadings(bands.value, reportProperties.value);
      // Locations: their parts laid out, their address written from the setup
      syncLocations(bands.value, {
        fontFamily: reportProperties.value.defaultFont?.name,
        fontSize: reportProperties.value.defaultFont?.size,
      });
      // Typed tables: the sums in their total row follow the numbers above
      for (const band of bands.value) {
        for (const element of band.elements) if (element.type === "customTable") syncTotals(element.table);
      }
      // A Table of Contents on contents pages gets the contents pages it needs
      const before = totalPages.value;
      const added = fitContentsPages(bands.value, reportProperties.value);
      if (added) {
        pageCount.value = Math.max(1, before + added);
        // The new pages' decorations fit their own rows
        fitListDecorations(bands.value, reportProperties.value);
      }
      const content = generateJRXMLContent(
        propertiesForJrxml(),
        bands.value,
        reportFields.value,
        reportParameters.value,
        subDatasets.value,
        tableStyles.value,
        reportVariables.value,
        [],
        reportGroups.value,
        totalPages.value,
      );
      if (content !== jrxmlContent.value) {
        // The first JRXML of a report: its state is the first undo step
        if (!useEditorStore().isDraggingOrResizing && history.historyStack.value.length === 0) {
          history.saveStateToHistory();
        }
        jrxmlContent.value = content;
        jrxmlVersion.value++;
      }
    } catch (error) {
      console.error("Failed to update JRXML:", error);
    } finally {
      writing = false;
    }
  }

  // The bands the report has, in order (the Page Settings band switches)
  const bandTypes = computed<BandType[]>(() => bands.value.map((b) => b.type));

  // Turn bands on or off (one undo step): new bands get the user's default
  // height and go in their usual place; Detail always stays. `record: false`:
  // part of a step recorded before (the AI assistant's message)
  function setBandTypes(types: BandType[], options: { record?: boolean } = {}) {
    const wanted = new Set<string>([...types, BAND_TYPE_CONSTANTS.DETAIL]);
    const present = new Set<string>(bandTypes.value);
    const toRemove = [...present].filter((type) => !wanted.has(type));
    const toAdd = [...wanted].filter((type) => !present.has(type));
    if (!toRemove.length && !toAdd.length) return;
    if (options.record !== false) history.saveStateToHistory();
    const config = getEffectiveDefaultBandConfig();
    const order = (type: string) => ALL_CONFIGURABLE_BANDS.findIndex((b) => b.type === type);
    const next = bands.value.filter((b) => !toRemove.includes(b.type));
    for (const type of toAdd) {
      const known = ALL_CONFIGURABLE_BANDS.find((b) => b.type === type) as { defaultHeight?: number } | undefined;
      const height =
        config[type]?.defaultHeight ??
        known?.defaultHeight ??
        (BAND_HEIGHT_CONSTANTS[type as keyof typeof BAND_HEIGHT_CONSTANTS] || 50);
      const at = next.findIndex((b) => order(b.type) > order(type));
      next.splice(at === -1 ? next.length : at, 0, { type: type as BandType, height, elements: [] });
    }
    bands.value = next;
    updateJrxml();
  }

  // Open a report: every part is set (missing ones get their new-report
  // value, so nothing is left from the report before), copies that share IDs
  // are repaired, and nothing is selected. The history starts empty, unless
  // keepHistory (applying edited JRXML is one undo step, recorded before).
  function loadReport(data: ReportData, options: { keepHistory?: boolean } = {}) {
    const props = data.reportProperties ?? {};
    reportProperties.value = {
      ...newReportProperties(),
      ...props,
      bandLimits: props.bandLimits || getEffectiveDefaultBandLimits(),
      // Each report has its own projects
      projects: props.projects ?? [],
      // A new template numbers its Headings "1."; an opened one keeps its own
      // (none = "SECTION 1.", what templates used before)
      headingNumbers: data.reportProperties ? props.headingNumbers : { ...NEW_REPORT_HEADING_NUMBERING },
    } as ReportProperties;
    bands.value = Array.isArray(data.bands) && data.bands.length ? data.bands : newBands();
    ensureUniqueUuids(bands.value);
    ensureUniqueTableDatasets(bands.value);
    resetBoxPhotos(bands.value);
    cleanLegacyAutoDate(bands.value);
    unwrapLegacyCoverFrames(bands.value, reportProperties.value);
    const detail = bands.value.find((b) => b.type === BAND_TYPE_CONSTANTS.DETAIL);
    const lastPage = Math.max(0, ...(detail?.elements ?? []).map((e: any) => e.pageIndex || 0));
    pageCount.value = Math.max(1, data.pageCount ?? props.pageCount ?? 0, lastPage + 1);
    reportFields.value = data.reportFields ?? [];
    reportParameters.value = data.reportParameters ?? [];
    subDatasets.value = data.subDatasets ?? [];
    tableStyles.value = data.tableStyles ?? [];
    reportVariables.value = data.reportVariables ?? [];
    reportGroups.value = data.reportGroups ?? [];
    jrxmlContent.value = data.jrxmlContent ?? "";
    if (!options.keepHistory) history.clear();
    useSelectionStore().reset();
  }

  // A new, empty report with no history
  function reset() {
    loadReport({});
  }

  // The report's properties as written to the JRXML. The report has one name,
  // the one in the header (the open file's): the name inside the file always
  // follows it, so the two can never differ (not even after an undo)
  function propertiesForJrxml(): ReportProperties & { pageCount: number } {
    const name = useFilesStore().currentFileName.trim();
    return { ...reportProperties.value, name: name || reportProperties.value.name, pageCount: totalPages.value };
  }

  return {
    propertiesForJrxml,
    jrxmlContent,
    reportProperties,
    bands,
    pageCount,
    reportFields,
    reportParameters,
    subDatasets,
    tableStyles,
    reportVariables,
    reportGroups,
    paperWidth,
    paperHeight,
    printableHeight,
    special,
    totalPages,
    historyStack: history.historyStack,
    redoStack: history.redoStack,
    saveStateToHistory: history.saveStateToHistory,
    undo: history.undo,
    redo: history.redo,
    jrxmlVersion,
    bandTypes,
    setBandTypes,
    loadReport,
    fitBandsToPage,
    updateJrxml,
    isWritingJrxml,
    reset,
  };
});
