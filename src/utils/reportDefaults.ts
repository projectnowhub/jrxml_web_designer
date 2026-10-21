// What a new report starts with (Default Settings, the bottom panel): its
// paper, margins, font and the parts every page has. The part heights are kept
// with the band defaults (getEffectiveDefaultBandConfig in constants.ts).
//
// Kept in this browser for now. Every read and write goes through
// loadReportDefaults / saveReportDefaults, so storing them with the user's
// account later (an API) changes only this file.
import { BAND_TYPE_CONSTANTS, FONT_CONSTANTS, REPORT_CONSTANTS } from "@/constants/constants";
import type { BandType } from "@/types";

export interface ReportDefaults {
  pageWidth: number;
  pageHeight: number;
  leftMargin: number;
  rightMargin: number;
  topMargin: number;
  bottomMargin: number;
  font: { name: string; size: number; isBold: boolean; isItalic: boolean; isUnderline: boolean };
  // The parts every page has (Detail always)
  bandTypes: BandType[];
}

const STORAGE_KEY = "designer.reportDefaults";

// The parts a new report can start with, in page order (Background is the
// page border's layer, off unless chosen)
export const DEFAULT_BAND_CHOICES: BandType[] = [
  BAND_TYPE_CONSTANTS.PAGE_HEADER,
  BAND_TYPE_CONSTANTS.COLUMN_HEADER,
  BAND_TYPE_CONSTANTS.DETAIL,
  BAND_TYPE_CONSTANTS.COLUMN_FOOTER,
  BAND_TYPE_CONSTANTS.PAGE_FOOTER,
  BAND_TYPE_CONSTANTS.BACKGROUND,
] as BandType[];

/** The app's own defaults (A4 portrait, 20 px margins, the report font, the usual parts) */
export function builtInReportDefaults(): ReportDefaults {
  return {
    pageWidth: REPORT_CONSTANTS.DEFAULT_PAGE_WIDTH,
    pageHeight: REPORT_CONSTANTS.DEFAULT_PAGE_HEIGHT,
    leftMargin: REPORT_CONSTANTS.DEFAULT_MARGIN,
    rightMargin: REPORT_CONSTANTS.DEFAULT_MARGIN,
    topMargin: REPORT_CONSTANTS.DEFAULT_MARGIN,
    bottomMargin: REPORT_CONSTANTS.DEFAULT_MARGIN,
    font: {
      name: FONT_CONSTANTS.DEFAULT_FONT_FAMILY,
      size: REPORT_CONSTANTS.DEFAULT_FONT_SIZE,
      isBold: false,
      isItalic: false,
      isUnderline: false,
    },
    bandTypes: [
      BAND_TYPE_CONSTANTS.PAGE_HEADER,
      BAND_TYPE_CONSTANTS.COLUMN_HEADER,
      BAND_TYPE_CONSTANTS.DETAIL,
      BAND_TYPE_CONSTANTS.COLUMN_FOOTER,
      BAND_TYPE_CONSTANTS.PAGE_FOOTER,
    ] as BandType[],
  };
}

const positive = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
const notNegative = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;

/** The saved defaults, any part missing or broken taken from the built-in ones */
export function loadReportDefaults(): ReportDefaults {
  const base = builtInReportDefaults();
  let saved: Partial<ReportDefaults> = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") ?? {};
  } catch {
    saved = {};
  }
  const bandTypes = Array.isArray(saved.bandTypes)
    ? DEFAULT_BAND_CHOICES.filter((type) => saved.bandTypes!.includes(type))
    : base.bandTypes;
  return {
    pageWidth: positive(saved.pageWidth, base.pageWidth),
    pageHeight: positive(saved.pageHeight, base.pageHeight),
    leftMargin: notNegative(saved.leftMargin, base.leftMargin),
    rightMargin: notNegative(saved.rightMargin, base.rightMargin),
    topMargin: notNegative(saved.topMargin, base.topMargin),
    bottomMargin: notNegative(saved.bottomMargin, base.bottomMargin),
    font: {
      name: typeof saved.font?.name === "string" ? saved.font.name : base.font.name,
      size: positive(saved.font?.size, base.font.size),
      isBold: !!saved.font?.isBold,
      isItalic: !!saved.font?.isItalic,
      isUnderline: !!saved.font?.isUnderline,
    },
    // Detail is always there
    bandTypes: bandTypes.includes(BAND_TYPE_CONSTANTS.DETAIL as BandType)
      ? bandTypes
      : DEFAULT_BAND_CHOICES.filter((type) => type === BAND_TYPE_CONSTANTS.DETAIL || bandTypes.includes(type)),
  };
}

export function saveReportDefaults(defaults: ReportDefaults): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  } catch {
    // Storage blocked: new reports use the built-in defaults
  }
}

export function resetReportDefaults(): ReportDefaults {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing saved to remove
  }
  return builtInReportDefaults();
}
