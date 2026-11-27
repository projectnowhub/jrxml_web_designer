// The Default Settings in the one settings format (SettingsBody), as the
// bottom panel's JSON tabs show them:
// - developer defaults: what the app comes with, set only in code
//   (builtInReportDefaults, DEVELOPER_DEFAULT_BAND_CONFIG, DEFAULT_SNAP_SETTINGS)
// - user defaults: what the user set in Default Settings / Snap & grid
//   (stores/userSettings.ts collects them)
import {
  DEFAULT_SNAP_SETTINGS,
  DEVELOPER_DEFAULT_BAND_CONFIG,
  GLOBAL_BAND_LIMITS_STORAGE_KEY,
  SNAP_SETTINGS_STORAGE_KEY,
} from "@/constants/constants";
import { builtInReportDefaults, saveReportDefaults, type ReportDefaults } from "@/utils/reportDefaults";
import { paperOf } from "@/utils/pageSetup";
import type { BandType } from "@/types";
import type {
  DeveloperDefaultSettings,
  SettingsBody,
  SnapAndGridSetting,
  UserDefaultSettings,
} from "@/types/settingsJson";

// The name the developer defaults carry in place of a template / user
export const DEVELOPER_SETTINGS_NAME = "Developer settings";

type BandConfig = Record<string, { defaultHeight: number; min: number; max: number }>;

// The settings in the one format both JSONs share (user default, developer default)
function buildSettingsBody(
  defaults: ReportDefaults,
  sectionHeights: SettingsBody["sectionHeights"],
  snapAndGrid: SnapAndGridSetting,
): SettingsBody {
  return {
    paperSize: paperOf(defaults.pageWidth, defaults.pageHeight).paper,
    orientation: defaults.pageWidth > defaults.pageHeight ? "landscape" : "portrait",
    pageWidth: defaults.pageWidth,
    pageHeight: defaults.pageHeight,
    leftMargin: defaults.leftMargin,
    rightMargin: defaults.rightMargin,
    topMargin: defaults.topMargin,
    bottomMargin: defaults.bottomMargin,
    font: { name: defaults.font.name, size: defaults.font.size },
    sections: [...defaults.bandTypes],
    sectionHeights,
    snapAndGrid: { ...snapAndGrid },
  };
}

// Default Settings (ReportDefaults + the section height setup) in the settings format
export function defaultsToSettingsBody(
  defaults: ReportDefaults,
  bands: BandConfig,
  snapAndGrid: SnapAndGridSetting,
): SettingsBody {
  const sectionHeights: SettingsBody["sectionHeights"] = {};
  for (const [type, config] of Object.entries(bands)) {
    sectionHeights[type] = { min: config.min, max: config.max, height: config.defaultHeight };
  }
  return buildSettingsBody(defaults, sectionHeights, snapAndGrid);
}

// What the app comes with
export function developerDefaultSettings(): DeveloperDefaultSettings {
  return {
    name: DEVELOPER_SETTINGS_NAME,
    ...defaultsToSettingsBody(builtInReportDefaults(), DEVELOPER_DEFAULT_BAND_CONFIG, DEFAULT_SNAP_SETTINGS),
  };
}

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

// The user's settings JSON read from the server (null when it isn't one)
export function parseUserSettings(text: string | null | undefined): Partial<UserDefaultSettings> | null {
  if (!text) return null;
  try {
    const value = JSON.parse(text) as Partial<UserDefaultSettings> | null;
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

// Puts settings read from the server into this browser's keys (Default
// Settings, Section Heights, Snap & grid); a missing or broken part keeps what
// is there (loadReportDefaults fills and checks every value)
export function storeUserSettings(settings: Partial<SettingsBody>): void {
  const defaults = builtInReportDefaults();
  const font = settings.font;
  saveReportDefaults({
    pageWidth: isNumber(settings.pageWidth) ? settings.pageWidth : defaults.pageWidth,
    pageHeight: isNumber(settings.pageHeight) ? settings.pageHeight : defaults.pageHeight,
    leftMargin: isNumber(settings.leftMargin) ? settings.leftMargin : defaults.leftMargin,
    rightMargin: isNumber(settings.rightMargin) ? settings.rightMargin : defaults.rightMargin,
    topMargin: isNumber(settings.topMargin) ? settings.topMargin : defaults.topMargin,
    bottomMargin: isNumber(settings.bottomMargin) ? settings.bottomMargin : defaults.bottomMargin,
    font: {
      name: typeof font?.name === "string" && font.name ? font.name : defaults.font.name,
      size: isNumber(font?.size) && font.size > 0 ? font.size : defaults.font.size,
    },
    bandTypes: Array.isArray(settings.sections) ? (settings.sections as BandType[]) : defaults.bandTypes,
  });
  try {
    const heights = settings.sectionHeights;
    if (heights && typeof heights === "object") {
      const bands: Record<string, { defaultHeight: number; min: number; max: number }> = {};
      for (const [type, dev] of Object.entries(DEVELOPER_DEFAULT_BAND_CONFIG)) {
        const item = heights[type];
        bands[type] = {
          defaultHeight: isNumber(item?.height) ? item.height : dev.defaultHeight,
          min: isNumber(item?.min) ? item.min : dev.min,
          max: isNumber(item?.max) ? item.max : dev.max,
        };
      }
      localStorage.setItem(GLOBAL_BAND_LIMITS_STORAGE_KEY, JSON.stringify(bands));
    }
    const snap = settings.snapAndGrid;
    if (snap && typeof snap === "object") {
      localStorage.setItem(
        SNAP_SETTINGS_STORAGE_KEY,
        JSON.stringify({
          snapToGrid: snap.snapToGrid !== false,
          snapToAlignment: snap.snapToAlignment !== false,
          showGrid: snap.showGrid !== false,
        }),
      );
    }
  } catch {
    // Storage blocked: this visit uses what is there
  }
}
