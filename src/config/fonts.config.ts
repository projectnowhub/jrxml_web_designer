// Fonts bundled with the app (src/styles/fonts.css) and shipped with JasperReports
// (jasperreports-fonts), so they look the same on the canvas and in the generated PDF.
// Always listed first, without browser detection, because web fonts load lazily.
export const BUNDLED_FONTS = [
  'DejaVu Sans',
  'DejaVu Serif',
  'DejaVu Sans Mono'
] as const;

// Default font for new reports and elements
export const DEFAULT_REPORT_FONT = 'DejaVu Sans';

export const SYSTEM_FONTS = [
  'Arial',
  'Arial Black',
  'Arial Narrow',
  'Calibri',
  'Cambria',
  'Cambria Math',
  'Comic Sans MS',
  'Consolas',
  'Courier',
  'Courier New',
  'Georgia',
  'Helvetica',
  'Impact',
  'Lucida Console',
  'Lucida Sans Unicode',
  'Microsoft Sans Serif',
  'Monaco',
  'Palatino Linotype',
  'Segoe UI',
  'Tahoma',
  'Times',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
  'San Francisco',
  'Segoe UI Emoji',
  'Segoe UI Symbol',
  'Apple Symbols',
  'Symbol',
  'Webdings',
  'Wingdings'
] as const;

export type FontName = typeof SYSTEM_FONTS[number];

export const DEFAULT_FONTS = [
  'SansSerif',
  'Serif',
  'Monospaced'
] as const;
