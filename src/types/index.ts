import type { ChartBinding, ReportProject, TableDataBinding, TableLook } from "./dataSource";

// Element type enum
export type ElementType =
  | "textField"
  | "image"
  | "line"
  | "rectangle"
  | "ellipse"
  | "frame"
  | "table"
  | "chart"
  | "barcode"
  | "customTable"
  | "contentsList";

// Query interface
export interface Query {
  language: string;
  text: string;
}

// Table dataset interface
export interface TableDataset {
  uuid: string;
  name: string;
  query?: Query;
  fields?: Field[];
}

// Field property interface
export interface FieldProperty {
  name: string;
  value: string;
}

// Field interface
export interface Field {
  name: string;
  class: string;
  properties?: FieldProperty[];
}

// Report property interface
export interface ReportProperty {
  name: string;
  value: string;
}

// Band type enum
export type BandType =
  | "pageHeader"
  | "columnHeader"
  | "detail"
  | "columnFooter"
  | "pageFooter"
  | "background";

// Pen style interface
export interface Pen {
  lineWidth?: number;
  lineStyle?: string;
  lineColor?: string;
}

// Border style interface
export interface Box {
  // Global border
  border?: string; // kept for backward compatibility
  borderColor?: string; // kept for backward compatibility
  borderWidth?: number; // global border width
  borderStyle?: string; // global border style

  // Per-side borders
  topBorder?: string; // kept for backward compatibility
  topBorderColor?: string; // kept for backward compatibility
  topBorderWidth?: number; // top border width
  topBorderStyle?: string; // top border style

  leftBorder?: string; // kept for backward compatibility
  leftBorderColor?: string; // kept for backward compatibility
  leftBorderWidth?: number; // left border width
  leftBorderStyle?: string; // left border style

  bottomBorder?: string; // kept for backward compatibility
  bottomBorderColor?: string; // kept for backward compatibility
  bottomBorderWidth?: number; // bottom border width
  bottomBorderStyle?: string; // bottom border style

  rightBorder?: string; // kept for backward compatibility
  rightBorderColor?: string; // kept for backward compatibility
  rightBorderWidth?: number; // right border width
  rightBorderStyle?: string; // right border style

  // Pen styles
  topPen?: Pen;
  leftPen?: Pen;
  bottomPen?: Pen;
  rightPen?: Pen;

  // Padding
  padding?: number;
  topPadding?: number;
  leftPadding?: number;
  bottomPadding?: number;
  rightPadding?: number;

  // Allow accessing properties via string index
  [key: string]: any;
}

// Group interface
export interface ReportGroup {
  name: string;
  uuid?: string;
  expression: string;
  isStartNewPage?: boolean;
  isStartNewColumn?: boolean;
  isRepeatHeader?: boolean;
  isReprintHeaderOnEachPage?: boolean;
  isResetPageNumber?: boolean;
  isHideColumnHeader?: boolean;
  isKeepTogether?: boolean;
  isKeepFooterTogether?: boolean;
  minHeightToStartNewPage?: number;
  header?: Band;
  footer?: Band;
}

// Report data interface
export interface ReportData {
  reportProperties: ReportProperties;
  bands: Band[];
  reportFields: ReportField[];
  reportParameters?: ReportParameter[];
  reportVariables?: ReportVariable[];
  reportGroups?: ReportGroup[];
  jrxmlContent: string;
}

// Report field interface
export interface ReportField {
  name: string;
  class: string;
}

// Report parameter interface
export interface ReportParameter {
  name: string;
  class: string;
  defaultValue?: string;
}

// Report variable interface
export interface ReportVariable {
  name: string;
  class: string;
  calculationType?:
    | "Nothing"
    | "Count"
    | "DistinctCount"
    | "Sum"
    | "Average"
    | "First"
    | "Min"
    | "Max"
    | "StDev"
    | "Variance";
  resetType?: "Report" | "Page" | "Column" | "Group";
  resetGroup?: string;
  expression?: string;
  initialValueExpression?: string;
}

// Conditional style interface
export interface ConditionalStyle {
  conditionExpression: string;
  properties: Partial<ReportStyle>;
}

// Report style interface
export interface ReportStyle {
  name: string;
  mode?: string;
  backcolor?: string;
  forecolor?: string;
  conditionExpression?: string;
  box?: Box;
  textAlignment?: string;
  verticalAlignment?: string;
  fontFamily?: string;
  fontSize?: number;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  conditionalStyles?: ConditionalStyle[];
}

// Font settings interface
export interface FontSettings {
  name: string;
  size: number;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
}

// Report properties interface
export interface ReportProperties {
  name: string;
  pageWidth: number;
  pageHeight: number;
  leftMargin: number;
  rightMargin: number;
  topMargin: number;
  bottomMargin: number;
  defaultFont: FontSettings;
  orientation?: "portrait" | "landscape";
  pageCount?: number;
  bandLimits?: Record<string, { min: number; max: number }>;
  // Projects whose data the report uses (the "Report Data" list)
  projects?: ReportProject[];
  // Pages at the front with no shared sections (utils/specialPages.ts): a
  // cover (designer page 0) and contents pages after it
  coverPage?: boolean;
  contentsPages?: number;
  // false: page numbers don't count the cover and contents pages
  countSpecialPages?: boolean;
  // The cover uses the whole sheet (written with a 0 bottom margin, see specialPages.ts)
  fullPageCover?: boolean;
  // How Section Headings number themselves (utils/headingSync.ts); unset: "SECTION 1."
  headingNumbers?: HeadingNumbering;
  // Table of Contents looks the user saved (utils/contentsList.ts)
  contentsStyles?: SavedContentsStyle[];
}

// A Table of Contents look saved by the user, offered next to the ready-made ones
export interface SavedContentsStyle {
  id: string;
  name: string;
  look: Partial<ContentsListData>;
}

// Section Headings counted 1, 2… in page order, shown in this style
export interface HeadingNumbering {
  style: ContentsSectionStyle;
  // "word" style: the word before the number ("SECTION 1.")
  word?: string;
  // Any other style: text before and after the number ("Chapter 1:")
  before?: string;
  after?: string;
}

// Base design element interface
export interface DesignElementBase {
  uuid?: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  forecolor?: string;
  forecolorMode?: "Opaque" | "Transparent";
  backcolor?: string;
  mode?: "Opaque" | "Transparent";
  fill?: "Solid" | "None";
  border?: string;
  box?: Box;
  fontFamily?: string;
  fontSize?: number;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  textAlignment?: "Left" | "Center" | "Right" | "Justified";
  verticalAlignment?: "Top" | "Middle" | "Bottom";
  markup?: string;
  textAdjust?: string;
  isStyledText?: boolean;
  isStretchWithOverflow?: boolean;
  // Common reportElement attributes
  key?: string;
  positionType?: "Float" | "FixRelativeToTop" | "FixRelativeToBottom";
  stretchType?:
    | "NoStretch"
    | "ElementGroupBottom"
    | "ElementGroupHeight"
    | "ContainerBottom"
    | "ContainerHeight";
  isPrintRepeatedValues?: boolean;
  isRemoveLineWhenBlank?: boolean;
  printWhenExpression?: string;
  styleExpression?: string;
  pageIndex?: number;
  // Custom properties
  properties?: Array<{ name: string; value: string }>;
  propertyExpressions?: Array<{ name: string; valueExpression: string }>;
}

// Text field element interface
export interface TextFieldElement extends DesignElementBase {
  type: "textField";
  expression?: string;
  rotation?: "None" | "Left" | "Right" | "UpsideDown";
  evaluationTime?:
    | "Now"
    | "Report"
    | "Page"
    | "Column"
    | "Group"
    | "Band"
    | "Auto"
    | "Master";
  evaluationGroup?: string;
  pattern?: string;
  patternExpression?: string;
  isBlankWhenNull?: boolean;
  hyperlinkType?:
    | "None"
    | "Reference"
    | "Anchor"
    | "LocalAnchor"
    | "LocalPage"
    | "RemotePage"
    | "RemoteAnchor"
    | "mailto"
    | "LocalPageBookmark"
    | "PdfAnchor";
  hyperlinkAnchor?: string;
  hyperlinkPage?: number;
  hyperlinkReferenceExpression?: string;
  hyperlinkAnchorExpression?: string;
  hyperlinkPageExpression?: string;
  hyperlinkTooltipExpression?: string;
  hyperlinkWhenExpression?: string;
  anchorNameExpression?: string;
  bookmarkLevel?: number;
  bookmarkLevelExpression?: string;
  printWhenExpression?: string;
  // Deprecated properties (kept for backward compatibility)
  isStretchWithOverflow?: boolean;
  hyperlinkTooltip?: string;
}

// Image element interface
export interface ImageElement extends DesignElementBase {
  type: "image";
  imageExpression?: string;
  // A Location's map: the place it shows, worked out from the Location's setup
  // with every change (never written to the JRXML)
  locationView?: { latitude: number; longitude: number; zoom: number } | null;
  scaleType?: "Clip" | "FillFrame" | "RealHeight" | "RealSize" | "RetainShape";
  hAlign?: "Left" | "Center" | "Right";
  vAlign?: "Top" | "Middle" | "Bottom";
  isUsingCache?: boolean;
  isLazy?: boolean;
  onErrorType?: "Error" | "Blank" | "Icon";
  evaluationTime?: "Now" | "Report" | "Page" | "Column" | "Band";
  rotation?: "None" | "Left" | "Right" | "UpsideDown";
  hyperlinkType?: string;
  hyperlinkReferenceExpression?: string;
  hyperlinkAnchorExpression?: string;
  hyperlinkPageExpression?: string;
  hyperlinkTooltipExpression?: string;
  hyperlinkWhenExpression?: string;
  anchorNameExpression?: string;
  bookmarkLevel?: number;
  bookmarkLevelExpression?: string;
  printWhenExpression?: string;
  // Deprecated properties (kept for backward compatibility)
  scaleImage?: "Clip" | "FillFrame" | "RetainShape" | "RealHeight" | "RealSize";
  hyperlinkTooltip?: string;
}

// Line element interface
export interface LineElement extends DesignElementBase {
  type: "line";
  lineDirection?: "TopDown" | "BottomUp";
  lineWidth?: number;
  lineColor?: string;
  lineStyle?: string;
  evaluationTime?: "Now" | "Report" | "Page" | "Column" | "Band";
  // Newly added properties
  isPrintRepeatedValues?: boolean;
  printWhenExpression?: string;
}

// Rectangle element interface
export interface RectangleElement extends DesignElementBase {
  type: "rectangle";
  radius?: number; // corner radius
  pen?: Pen; // border style
  // Newly added properties
  isPrintRepeatedValues?: boolean;
  isRemoveLineWhenBlank?: boolean;
  printWhenExpression?: string;
}

// Ellipse element interface
export interface EllipseElement extends DesignElementBase {
  type: "ellipse";
  pen?: Pen; // border style
  // Newly added properties
  isPrintRepeatedValues?: boolean;
  isRemoveLineWhenBlank?: boolean;
  printWhenExpression?: string;
}

// Frame (container) element interface
export interface FrameElement extends DesignElementBase {
  type: "frame";
  elements?: DesignElement[]; // child elements within the container
  layout?: "FreeLayout" | "HorizontalLayout" | "VerticalLayout"; // layout property
  evaluationTime?:
    | "Now"
    | "Report"
    | "Page"
    | "Column"
    | "Group"
    | "Band"
    | "Auto";
  // Conditional printing
  printWhenExpression?: string;
  printWhenGroupChanges?: string;
  // Pagination control
  isIgnorePagination?: boolean;
  isSplitAllowed?: boolean;
  splitType?: "Stretch" | "Prevent" | "Immediate";
  // Frame-specific properties
  isRemoveLineWhenBlank?: boolean;
  isPrintRepeatedValues?: boolean;
  // Corner radius when all four corners match
  radius?: number;
  // Corner radii when they differ (see BOX_CORNER_RADIUS_PROPERTY)
  cornerRadii?: { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number };
}

// Table element: shows rows of a backend source (see types/dataSource.ts).
// Without a binding it is an empty table waiting for data to be dropped on it.
export interface TableElement extends DesignElementBase {
  type: "table";
  binding?: TableDataBinding;
  headerHeight?: number;
  rowHeight?: number;
}

// Chart element: one of nine chart types (utils/chart). Written to the JRXML
// as an image of the chart with its setup (com.cdp.chart.binding), which the
// parser reads back.
export interface ChartElement extends DesignElementBase {
  type: "chart";
  binding: ChartBinding;
}

// Barcode element interface
export interface BarcodeElement extends DesignElementBase {
  type: "barcode";
  barcodeType:
    | "Code128"
    | "Code39"
    | "EAN13"
    | "EAN8"
    | "UPCA"
    | "UPCE"
    | "QRCode"
    | "DataMatrix"
    | "Interleaved2Of5"
    | "Codabar"
    | "EAN128"
    | "PDF417"
    | "POSTNET"
    | "RoyalMailCustomer"
    | "USPSIntelligentMail";
  codeExpression?: string;
  // Values typed for the other types (their code expressions): switching
  // back to a type brings its own value back (com.cdp.barcode.values)
  valuesByType?: Partial<Record<string, string>>;
  printWhenExpression?: string;
  rotation?: "None" | "Left" | "Right" | "UpsideDown";
  evaluationTime?:
    | "Now"
    | "Report"
    | "Page"
    | "Column"
    | "Group"
    | "Band"
    | "Auto";
}

// Custom table: a grid the user types into (not project data). A merged cell is
// the top-left cell of the block with colSpan / rowSpan; the cells it covers stay
// in the grid but are not shown or written.
export interface CustomTableCell {
  // Plain text ("\n" for new lines), or HTML when `rich` (bold words, colours,
  // bullet points, superscript...: what JasperReports' html markup reads)
  text: string;
  rich?: boolean;
  colSpan?: number;
  rowSpan?: number;
  fill?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: "Left" | "Center" | "Right" | "Justified";
  vAlign?: "Top" | "Middle" | "Bottom";
  fontSize?: number;
}

export interface CustomTableRow {
  // Design height; in the PDF a row grows to its tallest text
  height: number;
  cells: CustomTableCell[];
}

// Its look is a table style, like a data table's: `theme` is the built-in or saved
// style it started from, `look` its actual look (none for an unchanged built-in),
// `customized` = changed for this table only. Colours set on cells are exceptions
// on top of the style.
export interface CustomTableData {
  columns: number[];
  rows: CustomTableRow[];
  theme: string;
  look?: TableLook;
  customized?: boolean;
  // Top rows drawn as headings (0 to 3)
  headerRows: number;
  // The last row drawn as a totals row
  totalRow: boolean;
  padding: number;
}

export interface CustomTableElement extends DesignElementBase {
  type: "customTable";
  table: CustomTableData;
}

// Contents list (table of contents): one row per entry, written as plain text
// fields (utils/contentsList.ts)
export interface ContentsEntry {
  number: string;
  title: string;
  page: string;
  // 0: a section, 1: a sub-section (indented, not bold)
  level: 0 | 1;
  // Which heading (its uuid) the row stands for, in a list that follows the
  // headings
  key?: string;
}

// Automatic mode: the user's choices for the heading rows (kept on the first
// part, keyed by the heading's uuid): headings left out, and the numbers typed
// in when "Number automatically" is off (`ContentsListData.ownNumbers`)
export interface ContentsAdjust {
  hidden?: string[];
  numbers?: Record<string, string>;
}

export interface ContentsListData {
  entries: ContentsEntry[];
  rowHeight: number;
  fontSize: number;
  // Width of the number column (0: no numbers) and of the page column
  numberWidth: number;
  pageWidth: number;
  // Dots between each title and its page
  leader: boolean;
  boldSections: boolean;
  color: string;
  // A filled box behind each number ("Numbered blocks"), and its text colour
  numberFill?: string;
  numberColor?: string;
  // The list this one carries on (a second column or a later contents page)
  continues?: string;
  // Numbers counted automatically (sections 1, 2…; sub-sections i, ii…); off:
  // the numbers typed in the rows
  autoNumber?: boolean;
  sectionStyle?: ContentsSectionStyle;
  // "word" style: the word before the number ("SECTION 1.")
  sectionWord?: string;
  // Any style: text before and after the number ("Chapter 1:")
  sectionBefore?: string;
  sectionAfter?: string;
  subStyle?: ContentsSubStyle;
  // On a contents page: the box keeps the size the user gives it (rows that
  // don't fit go on to the next contents page) instead of growing with its rows
  fixedBox?: boolean;
  // On a contents page added by itself for rows that didn't fit (removed again
  // by itself once it is empty and unchanged)
  autoPage?: boolean;
  // Kept in step with the Section Headings and Sub-headings on the pages: its
  // rows are rebuilt from them after every change (utils/headingSync.ts)
  follow?: boolean;
  // Automatic mode with "Number automatically" off: numbers typed per row
  ownNumbers?: boolean;
  // Show sections only: sub-sections are left out (Automatic) or hidden, not
  // deleted (Manual)
  sectionsOnly?: boolean;
  adjust?: ContentsAdjust;
}

export type ContentsSectionStyle = "1" | "1." | "01" | "I" | "A" | "a" | "i" | "1)" | "(1)" | "word";
export type ContentsSubStyle =
  | "roman"
  | "letters"
  | "decimal"
  | "romanUpper"
  | "lettersUpper"
  | "lettersParen"
  | "romanParen"
  | "lettersBracket"
  | "sectionLetter"
  | "none";

export interface ContentsListElement extends DesignElementBase {
  type: "contentsList";
  list: ContentsListData;
}

// Design element union type
export type DesignElement =
  | TextFieldElement
  | ImageElement
  | LineElement
  | RectangleElement
  | EllipseElement
  | FrameElement
  | TableElement
  | ChartElement
  | BarcodeElement
  | CustomTableElement
  | ContentsListElement;

// Report band interface
export interface Band {
  type: BandType;
  height: number;
  elements: DesignElement[];
  splitType?: "Stretch" | "Prevent" | "Immediate";
  isSplitAllowed?: boolean; // adds the deprecated isSplitAllowed property for backward compatibility
}

// Selected element info interface
export interface SelectedElementInfo {
  bandIndex: number;
  elementIndex: number;
  parentFrameIndex?: number; // if inside a Frame, this is the Frame's index within the Band
  uuid?: string;
}

// Multi-selected elements info interface
export interface SelectedElementsInfo {
  elements: Array<{
    bandIndex: number;
    elementIndex: number;
    parentFrameIndex?: number;
    uuid?: string;
  }>;
}

// Editing element info interface
export interface EditingElementInfo {
  bandIndex: number;
  elementIndex: number;
  parentFrameIndex?: number;
}

// Dragging info interface
export interface DraggingInfo {
  bandIndex: number;
  elementIndex: number;
  parentFrameIndex?: number;
  startX: number;
  startY: number;
  origElementX?: number;
  origElementY?: number;
  lastTargetBandIndex?: number;
  lastTargetFrameIndex?: number; // records the index of the most recent target Frame
  sourcePageIndex?: number;
  lastTargetPageIndex?: number;
}

// Element library item interface
export interface ElementLibraryItem {
  type: ElementType;
  name: string;
}
