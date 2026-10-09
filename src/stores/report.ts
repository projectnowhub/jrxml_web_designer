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
import { ensureUniqueTableDatasets } from "@/utils/table/tableDocument";
import { useEditorStore } from "./editor";
import { useSelectionStore } from "./selection";
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

function newReportProperties(): ReportProperties {
  return {
    name: "NewReport",
    pageWidth: REPORT_CONSTANTS.DEFAULT_PAGE_WIDTH,
    pageHeight: REPORT_CONSTANTS.DEFAULT_PAGE_HEIGHT,
    leftMargin: REPORT_CONSTANTS.DEFAULT_MARGIN,
    rightMargin: REPORT_CONSTANTS.DEFAULT_MARGIN,
    topMargin: REPORT_CONSTANTS.DEFAULT_MARGIN,
    bottomMargin: REPORT_CONSTANTS.DEFAULT_MARGIN,
    defaultFont: {
      name: FONT_CONSTANTS.DEFAULT_FONT_FAMILY,
      size: REPORT_CONSTANTS.DEFAULT_FONT_SIZE,
      isBold: false,
      isItalic: false,
      isUnderline: false,
    },
    bandLimits: getEffectiveDefaultBandLimits(),
  };
}

// The bands of a new report, at the user's default heights; Detail takes the
// rest of an A4 page
function newBands(): Band[] {
  const config = getEffectiveDefaultBandConfig();
  const height = (type: string, fallback: number) =>
    config[type]?.defaultHeight ?? (BAND_HEIGHT_CONSTANTS[type as keyof typeof BAND_HEIGHT_CONSTANTS] || fallback);
  const pageHeader = height(BAND_TYPE_CONSTANTS.PAGE_HEADER, 50);
  const columnHeader = height(BAND_TYPE_CONSTANTS.COLUMN_HEADER, 30);
  const columnFooter = height(BAND_TYPE_CONSTANTS.COLUMN_FOOTER, 30);
  const pageFooter = height(BAND_TYPE_CONSTANTS.PAGE_FOOTER, 40);
  const detail = Math.max(50, 802 - (pageHeader + columnHeader + columnFooter + pageFooter));
  const band = (type: string, h: number): Band => ({ type: type as BandType, height: h, elements: [] });
  return [
    band(BAND_TYPE_CONSTANTS.PAGE_HEADER, pageHeader),
    band(BAND_TYPE_CONSTANTS.COLUMN_HEADER, columnHeader),
    band(BAND_TYPE_CONSTANTS.DETAIL, detail),
    band(BAND_TYPE_CONSTANTS.COLUMN_FOOTER, columnFooter),
    band(BAND_TYPE_CONSTANTS.PAGE_FOOTER, pageFooter),
  ];
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
  const totalPages = computed(() => {
    const detail = bands.value.find((b) => b.type === BAND_TYPE_CONSTANTS.DETAIL);
    const lastPage = Math.max(0, ...(detail?.elements ?? []).map((e: any) => e.pageIndex || 0));
    return Math.max(pageCount.value, lastPage + 1);
  });

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
      const content = generateJRXMLContent(
        { ...reportProperties.value, pageCount: totalPages.value },
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
  // height and go in their usual place; Detail always stays
  function setBandTypes(types: BandType[]) {
    const wanted = new Set<string>([...types, BAND_TYPE_CONSTANTS.DETAIL]);
    const present = new Set<string>(bandTypes.value);
    const toRemove = [...present].filter((type) => !wanted.has(type));
    const toAdd = [...wanted].filter((type) => !present.has(type));
    if (!toRemove.length && !toAdd.length) return;
    history.saveStateToHistory();
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
    } as ReportProperties;
    bands.value = Array.isArray(data.bands) && data.bands.length ? data.bands : newBands();
    ensureUniqueUuids(bands.value);
    ensureUniqueTableDatasets(bands.value);
    resetBoxPhotos(bands.value);
    const detail = bands.value.find((b) => b.type === BAND_TYPE_CONSTANTS.DETAIL);
    const lastPage = Math.max(0, ...(detail?.elements ?? []).map((e: any) => e.pageIndex || 0));
    pageCount.value = Math.max(1, data.pageCount ?? 0, lastPage + 1);
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

  return {
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
