// Default font for new reports and elements
export const DEFAULT_REPORT_FONT = 'Noto Sans SC';

// Fonts the report server can render today. The font pickers offer only these
// (read-only while there is just one) and every other font is written as the
// default, so the PDF never falls back to a missing font.
export const SUPPORTED_FONTS = [DEFAULT_REPORT_FONT] as const;

// Returns the font to use for a stored font name: the name itself when the report
// server supports it, otherwise the default report font.
export const resolveReportFont = (name?: string | null): string =>
  name && (SUPPORTED_FONTS as readonly string[]).includes(name) ? name : DEFAULT_REPORT_FONT;

// Full font list, kept for when the report server supports more fonts.
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
  'Noto Sans SC',
  'Noto Serif SC',
  'PingFang SC',
  'PingFang TC',
  'Microsoft YaHei',
  'SimHei',
  'SimSun',
  'STSong',
  'WenQuanYi Micro Hei',
  'Droid Sans Fallback',
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
