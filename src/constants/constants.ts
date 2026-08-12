// Designer constant definitions

// Zoom-related constants
export const ZOOM_CONSTANTS = {
  DEFAULT_ZOOM: 1,
  ZOOM_LEVELS: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2],
  MIN_ZOOM: 0.25,
  MAX_ZOOM: 2,
  OPTIMAL_ZOOM_MARGIN: 0.9, // margin coefficient used when calculating the optimal zoom ratio
};

// Panel size constants
export const PANEL_CONSTANTS = {
  DEFAULT_BOTTOM_PANEL_HEIGHT: 320,
  DEFAULT_PROPERTY_PANEL_WIDTH: 320,
  DEFAULT_LEFT_PANEL_WIDTH: 240, // default width of the left panel
  LEFT_PANEL_MIN_WIDTH: 150, // minimum width of the left panel
  LEFT_PANEL_MAX_WIDTH: 400, // maximum width of the left panel
};

// Report property constants
export const REPORT_CONSTANTS = {
  DEFAULT_PAGE_WIDTH: 595, // A4 width (pixels)
  DEFAULT_PAGE_HEIGHT: 842, // A4 height (pixels)
  DEFAULT_MARGIN: 20,
  DEFAULT_FONT_SIZE: 12,
  MIN_ELEMENT_WIDTH: 20,
  MIN_ELEMENT_HEIGHT: 10,
  MIN_BAND_HEIGHT: 0,
  MAX_BAND_HEIGHT: 800,
};

// History constants
export const HISTORY_CONSTANTS = {
  MAX_HISTORY_SIZE: 50,
};

// Keyboard navigation constants
export const KEYBOARD_CONSTANTS = {
  ELEMENT_PASTE_OFFSET: 10,
  SECONDARY_AXIS_WEIGHT: 0.1,
};

// DOM operation constants
export const DOM_CONSTANTS = {
  CALCULATE_ZOOM_DELAY: 100, // delay before calculating the zoom ratio (milliseconds)
  SCROLL_BAR_WIDTH: 40, // estimated scrollbar width
};

// Border style constants
export const BORDER_CONSTANTS = {
  THIN: 'Thin',
  MEDIUM: 'Medium',
  THICK: 'Thick',
  DASHED: 'Dashed',
  DOTTED: 'Dotted',
  DOUBLE: 'Double',
  // Border width constants
  THIN_WIDTH: 1,
  MEDIUM_WIDTH: 2,
  THICK_WIDTH: 4,
};

// Text alignment constants
export const TEXT_ALIGN_CONSTANTS = {
  LEFT: 'Left',
  CENTER: 'Center',
  RIGHT: 'Right',
  JUSTIFIED: 'Justified',
};

// Vertical alignment constants
export const VERTICAL_ALIGN_CONSTANTS = {
  TOP: 'Top',
  MIDDLE: 'Middle',
  BOTTOM: 'Bottom',
};

// Font constants
export const FONT_CONSTANTS = {
  DEFAULT_FONT_FAMILY: 'Noto Serif SC',
  // Font size constants
  DEFAULT_SIZE: 12,
  MIN_SIZE: 8,
  MAX_SIZE: 72,
  HEADER_SIZE: 16,
  LABEL_SIZE: 14,
  SMALL_SIZE: 10,
  TINY_SIZE: 8,
};

// Element type constants
export const ELEMENT_TYPE_CONSTANTS = {
  STATIC_TEXT: 'staticText',
  TEXT_FIELD: 'textField',
  IMAGE: 'image',
  LINE: 'line',
  RECTANGLE: 'rectangle',
  ELLIPSE: 'ellipse',
  BREAK: 'break',
  FRAME: 'frame',
};

// Element size constants
export const ELEMENT_CONSTANTS = {
  MIN_WIDTH: 20,
  MIN_HEIGHT: 10,
};

// Band type constants
export const BAND_TYPE_CONSTANTS = {
  TITLE: 'title',
  PAGE_HEADER: 'pageHeader',
  COLUMN_HEADER: 'columnHeader',
  DETAIL: 'detail',
  COLUMN_FOOTER: 'columnFooter',
  PAGE_FOOTER: 'pageFooter',
  SUMMARY: 'summary',
  BACKGROUND: 'background',
  LAST_PAGE_FOOTER: 'lastPageFooter',
  NO_DATA: 'noData',
};

// Band default height constants
export const BAND_HEIGHT_CONSTANTS = {
  [BAND_TYPE_CONSTANTS.TITLE]: 80,
  [BAND_TYPE_CONSTANTS.PAGE_HEADER]: 50,
  [BAND_TYPE_CONSTANTS.COLUMN_HEADER]: 30,
  [BAND_TYPE_CONSTANTS.DETAIL]: 100,
  [BAND_TYPE_CONSTANTS.COLUMN_FOOTER]: 30,
  [BAND_TYPE_CONSTANTS.PAGE_FOOTER]: 40,
  [BAND_TYPE_CONSTANTS.SUMMARY]: 60,
  [BAND_TYPE_CONSTANTS.BACKGROUND]: 0,
  [BAND_TYPE_CONSTANTS.LAST_PAGE_FOOTER]: 40,
  [BAND_TYPE_CONSTANTS.NO_DATA]: 50,
};

// Band-related constants
export const BAND_CONSTANTS = {
  MIN_HEIGHT: 20,
  DEFAULT_ADDITIONAL_MARGIN: 10,
  DETAIL_ADDITIONAL_MARGIN: 15,
  SPACING: 0, // spacing between bands
};

// Evaluation time constants
export const EVALUATION_TIME_CONSTANTS = {
  NOW: 'Now',
  REPORT: 'Report',
  PAGE: 'Page',
  COLUMN: 'Column',
  GROUP: 'Group',
  BAND: 'Band',
  AUTO: 'Auto',
};

// Ruler-related constants
export const RULER_CONSTANTS = {
  UNIT_SIZE: 5, // base unit, 5px
  MAJOR_TICK_INTERVAL: 25, // major tick interval, 25px
  LABEL_INTERVAL: 25, // label interval, 25px
};

// UI size constants
export const UI_CONSTANTS = {
  // Element size
  DEFAULT_ELEMENT_WIDTH: 100,
  DEFAULT_ELEMENT_HEIGHT: 30,
  MIN_ELEMENT_SIZE: 20,
  // Border width
  BORDER_THIN: 1,
  BORDER_MEDIUM: 2,
  BORDER_THICK: 4,
  // Panel size
  BOTTOM_PANEL_MIN_HEIGHT: 100,
  BOTTOM_PANEL_MAX_HEIGHT: 800,
  PROPERTY_PANEL_MIN_WIDTH: 200,
  PROPERTY_PANEL_MAX_WIDTH: 500,
  // Ruler size
  RULER_WIDTH: 40,
  RULER_HEIGHT: 40,
  RULER_LABEL_SIZE: 10,
  // Modal size
  MODAL_MAX_WIDTH: 800,
  MODAL_MAX_HEIGHT: 80,
  MODAL_PADDING: 20,
  // Button size
  BUTTON_SMALL_HEIGHT: 30,
  BUTTON_SMALL_WIDTH: 30,
  // Other UI sizes
  LINE_HEIGHT: 1,
  LINE_HEIGHT_PX: 20, // line height in pixels
  TAB_BUTTON_HEIGHT: 40,
  RESIZE_HANDLE_SIZE: 10,
  RESIZE_HANDLE_WIDTH: 4,
  BOX_SHADOW_OFFSET: 2,
  BOX_SHADOW_BLUR: 10,
  BORDER_RADIUS_SMALL: 4,
  BORDER_RADIUS_MEDIUM: 6,
  BORDER_RADIUS_LARGE: 8,
  // Grid size
  GRID_SIZE: 10,
  // Font size
  FONT_SIZE_DEFAULT: 14,
  FONT_SIZE_SMALL: 13,
  FONT_SIZE_TINY: 12,
  FONT_SIZE_MINI: 11,
  FONT_SIZE_MEDIUM: 15,
  FONT_SIZE_LABEL: 14,
  FONT_SIZE_HEADER: 16,
  // Spacing
  SMALL_MARGIN: 8,
  MEDIUM_MARGIN: 12,
  LARGE_MARGIN: 20,
  SMALL_GAP: 5,
  MEDIUM_GAP: 15,
  // Input field padding
  INPUT_PADDING_SMALL: '6px 12px',
  INPUT_PADDING_MEDIUM: '8px 16px',
  // Panel padding
  PANEL_PADDING: 16,
  // DOM operation delay
  DOM_RENDER_DELAY: 100,
  // Keyboard operation offset
  ELEMENT_PASTE_OFFSET: 10,
  SECONDARY_AXIS_WEIGHT: 0.1,
};
