// Element type enum
export type ElementType =
  | "staticText"
  | "textField"
  | "image"
  | "line"
  | "rectangle"
  | "ellipse"
  | "break"
  | "frame"
  | "table"
  | "subreport"
  | "list"
  | "chart"
  | "barcode"
  | "map"
  | "crosstab"
  | "iconLabel"
  | "genericElement"
  | "sort";

// Column group interface
export interface ColumnGroup {
  uuid: string;
  name: string;
  width: number;
  hasTableHeader?: boolean;
  tableHeader?: TableCell;
  columnHeader?: TableCell;
  columnFooter?: TableCell;
  tableFooter?: TableCell;
  // Sub-groups or columns
  children: (ColumnGroup | TableColumn)[];
}

// Table cell interface
export interface TableCell {
  enable: boolean;
  element?: DesignElement;
}

// Table column interface
export interface TableColumn {
  uuid: string;
  width: number;
  name: string;
  hasTableHeader?: boolean;
  tableHeader?: TableCell;
  columnHeader?: TableCell;
  detailCell?: TableCell;
  columnFooter?: TableCell;
  tableFooter?: TableCell;
  children?: (ColumnGroup | TableColumn)[];
}

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
  | "detail"
  | "pageHeader"
  | "pageFooter"
  | "title"
  | "summary"
  | "columnHeader"
  | "columnFooter"
  | "background"
  | "lastPageFooter"
  | "noData";

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
  parentStyle?: string;
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
  style?: string;
  // Common reportElement attributes
  key?: string;
  positionType?: "Float" | "FixRelativeToTop" | "FixRelativeToBottom";
  stretchType?: "NoStretch" | "ElementGroupBottom" | "ElementGroupHeight" | "ContainerBottom" | "ContainerHeight";
  isPrintRepeatedValues?: boolean;
  isRemoveLineWhenBlank?: boolean;
  printWhenExpression?: string;
  styleExpression?: string;
  // Custom properties
  properties?: Array<{ name: string; value: string }>;
  propertyExpressions?: Array<{ name: string; valueExpression: string }>;
}

// Static text element interface
export interface StaticTextElement extends DesignElementBase {
  type: "staticText";
  text?: string;
  markup?: "none" | "html" | "rtf" | "styledtext";
  textAdjust?: "StretchHeight" | "CutText" | "ShrinkToFit";
  rotation?: "None" | "Left" | "Right";
  pattern?: string;
  xml_lang?: string;
  printWhenExpression?: string;
}

// Text field element interface
export interface TextFieldElement extends DesignElementBase {
  type: "textField";
  expression?: string;
  evaluationTime?:
    | "Now"
    | "Report"
    | "Page"
    | "Column"
    | "Group"
    | "Band"
    | "Auto";
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

// Break element interface
export interface BreakElement extends DesignElementBase {
  type: "break";
  breakType?: "Page" | "Column";
  // Newly added properties
  isResetPageNumber?: boolean;
  isResetPageOverflow?: boolean;
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
}

// Row group interface
export interface RowGroup {
  uuid: string;
  name: string;
  height: number;
  header?: TableCell;
  footer?: TableCell;
  isStartNewPage?: boolean;
  isRepeatHeader?: boolean;
  expression?: string;
}

// Table element interface
export interface TableElement extends DesignElementBase {
  type: "table";
  dataset: TableDataset;
  // Supports a mixed structure of groups and columns
  children?: (ColumnGroup | TableColumn)[];
  // Kept for backward compatibility, supports the legacy columns array
  columns: TableColumn[];
  // Row groups
  rowGroups?: RowGroup[];
  styles?: {
    tableHeader?: string;
    columnHeader?: string;
    detail?: string;
    columnFooter?: string;
    tableFooter?: string;
  };
  whenNoDataType?:
    | "Blank"
    | "NoDataCell"
    | "AllSectionsNoDetail"
    | "AllSectionsWithDetail";
  // Table-level properties
  printHeaders?: boolean;
  ignoreWidth?: boolean;
  isIgnorePagination?: boolean;
  // Style inheritance
  style?: string;
  parentStyle?: string;
  // Pagination control
  splitType?: "Stretch" | "Prevent" | "Immediate";
}

// Subreport element interface
export interface SubreportElement extends DesignElementBase {
  type: "subreport";
  subreportExpression?: string;
  parametersMapExpression?: string;
  connectionExpression?: string;
  dataSourceExpression?: string;
  returnValue?: {
    subreportVariable: string;
    toVariable: string;
    calculationType?: string;
  }[];
  printWhenExpression?: string;
  isUsingCache?: boolean;
  runToBottom?: boolean;
  evaluationTime?: "Now" | "Report" | "Page" | "Column" | "Group" | "Band" | "Auto" | "Master";
  evaluationGroup?: string;
  isIgnorePagination?: boolean;
}

// List element interface
export interface ListElement extends DesignElementBase {
  type: "list";
  listContents?: {
    elements: DesignElement[];
    height?: number;
    width?: number;
  };
  // Sub-dataset run configuration
  subDataset?: string;
  dataSourceExpression?: string;
  connectionExpression?: string;
  // List settings
  printOrder?: "Vertical" | "Horizontal";
  ignoreWidth?: boolean;
  // Conditional display
  printWhenExpression?: string;
  // Evaluation settings
  evaluationTime?: "Now" | "Report" | "Page" | "Column" | "Group" | "Band" | "Auto";
  evaluationGroup?: string;
  // Pagination settings
  splitType?: "Stretch" | "Prevent" | "Immediate";
  isIgnorePagination?: boolean;
}

// Chart element interface
export interface ChartElement extends DesignElementBase {
  type: "chart";
  chartType: "pie" | "pie3D" | "bar" | "bar3D" | "xyBar" | "stackedBar" | "stackedBar3D" | "line" | "xyLine" | "area" | "xyArea" | "scatter" | "bubble" | "timeSeries" | "highLow" | "candlestick" | "meter" | "thermometer" | "multiAxis" | "stackedArea" | "gantt" | "spider";
  // Chart title
  title?: string;
  titleExpression?: string;
  subtitleExpression?: string;
  legendExpression?: string;
  // Chart settings
  isShowLegend?: boolean;
  isShowTitle?: boolean;
  isShowSubtitle?: boolean;
  renderType?: "svg" | "draw" | "image";
  customizerClass?: string;
  // Hyperlink
  hyperlinkTooltipExpression?: string;
  hyperlinkTarget?: "Self" | "Blank" | "Top" | "Parent";
  hyperlinkType?: "None" | "Reference" | "LocalAnchor" | "LocalPage" | "RemoteAnchor" | "RemotePage" | "Tooltip";
  hyperlinkExpression?: string;
  bookmarkLevel?: number;
  // Evaluation settings
  evaluationTime?: "Now" | "Report" | "Page" | "Column" | "Group" | "Band" | "Auto" | "Master";
  evaluationGroup?: string;
  printWhenExpression?: string;
  // Dataset
  subDataset?: string;
  dataSourceExpression?: string;
  incrementType?: "None" | "Group" | "Page" | "Column" | "Report";
  incrementGroup?: string;
  // Series expressions (categorical charts: bar, line, area, stackedBar, etc.)
  seriesExpression?: string;
  categoryExpression?: string;
  valueExpression?: string;
  // Pie chart expression
  keyExpression?: string;
  // XY chart expressions (scatter, bubble, xyLine, xyArea, timeSeries, etc.)
  xValueExpression?: string;
  yValueExpression?: string;
  // Rendering settings
  isCircular?: boolean;
  isShowShapes?: boolean;
  itemLabelColor?: string;
  itemLabelBackgroundColor?: string;
  categoryAxisLabelExpression?: string;
  valueAxisLabelExpression?: string;
  // Specific to gauge/thermometer charts
  dataExpression?: string;
  shape?: "chord" | "pie" | "circle" | "fan" | "dash" | "bullet";
  lowExpression?: string;
  mediumExpression?: string;
  highExpression?: string;
  units?: string;
}

// Barcode element interface
export interface BarcodeElement extends DesignElementBase {
  type: "barcode";
  barcodeType: "Code128" | "Code39" | "EAN13" | "EAN8" | "UPCA" | "UPCE" | "QRCode" | "DataMatrix" | "Interleaved2Of5" | "Codabar" | "EAN128" | "PDF417" | "POSTNET" | "RoyalMailCustomer" | "USPSIntelligentMail";
  codeExpression?: string;
  printWhenExpression?: string;
  evaluationTime?: "Now" | "Report" | "Page" | "Column" | "Group" | "Band" | "Auto";
}

// Map element interface
export interface MapElement extends DesignElementBase {
  type: "map";
  mapType?: "html" | "image" | "pdf";
  latExpression?: string;
  lngExpression?: string;
  zoomExpression?: string;
  languageExpression?: string;
  printWhenExpression?: string;
  evaluationTime?: "Now" | "Report" | "Page" | "Column" | "Group" | "Band" | "Auto";
}

// Crosstab element interface
export interface CrosstabElement extends DesignElementBase {
  type: "crosstab";
  crosstabWidth?: number;
  crosstabHeight?: number;
  printWhenExpression?: string;
  whenNoDataType?: "AllSectionsNoDetail" | "AllSectionsWithDetail" | "NoDataCell" | "Blank";
  evaluationTime?: "Now" | "Report" | "Page" | "Column" | "Group" | "Band" | "Auto" | "Master";
}

// Icon label element interface
export interface IconLabelElement extends DesignElementBase {
  type: "iconLabel";
  icon?: string;
  label?: string;
  labelExpression?: string;
  printWhenExpression?: string;
  evaluationTime?: "Now" | "Report" | "Page" | "Column" | "Group" | "Band" | "Auto";
}

// Generic element interface
export interface GenericElement extends DesignElementBase {
  type: "genericElement";
  namespace?: string;
  printWhenExpression?: string;
  evaluationTime?: "Now" | "Report" | "Page" | "Column" | "Group" | "Band" | "Auto";
}

// Sort element interface
export interface SortElement extends DesignElementBase {
  type: "sort";
  sortFields?: Array<{
    name: string;
    order?: "Ascending" | "Descending";
  }>;
  printWhenExpression?: string;
  evaluationTime?: "Now" | "Report" | "Page" | "Column" | "Group" | "Band" | "Auto";
}

// Design element union type
export type DesignElement =
  | StaticTextElement
  | TextFieldElement
  | ImageElement
  | LineElement
  | RectangleElement
  | EllipseElement
  | BreakElement
  | FrameElement
  | TableElement
  | SubreportElement
  | ListElement
  | ChartElement
  | BarcodeElement
  | MapElement
  | CrosstabElement
  | IconLabelElement
  | GenericElement
  | SortElement;

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
  lastTargetBandIndex?: number;
  lastTargetFrameIndex?: number; // records the index of the most recent target Frame
}

// Selection box interface
export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Element library item interface
export interface ElementLibraryItem {
  type: ElementType;
  name: string;
}
