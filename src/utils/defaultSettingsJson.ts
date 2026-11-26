// The Default Settings in the one settings format (SettingsBody), as the
// bottom panel's JSON tabs show them:
// - developer defaults: what the app comes with, set only in code
//   (builtInReportDefaults, DEVELOPER_DEFAULT_BAND_CONFIG, DEFAULT_SNAP_SETTINGS)
// - user defaults: what the user set in Default Settings / Snap & grid
//   (stores/userSettings.ts collects them)
import { DEFAULT_SNAP_SETTINGS, DEVELOPER_DEFAULT_BAND_CONFIG } from "@/constants/constants";
import { builtInReportDefaults, type ReportDefaults } from "@/utils/reportDefaults";
import { buildSettingsBody } from "@/utils/templateSettingsValue";
import type {
  DeveloperDefaultSettings,
  SettingsBody,
  SnapAndGridSetting,
} from "@/types/settingsJson";

// The name the developer defaults carry in place of a template / user
export const DEVELOPER_SETTINGS_NAME = "Developer settings";

type BandConfig = Record<string, { defaultHeight: number; min: number; max: number }>;

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
  return buildSettingsBody(defaults, defaults.bandTypes, sectionHeights, snapAndGrid);
}

// What the app comes with
export function developerDefaultSettings(): DeveloperDefaultSettings {
  return {
    name: DEVELOPER_SETTINGS_NAME,
    ...defaultsToSettingsBody(builtInReportDefaults(), DEVELOPER_DEFAULT_BAND_CONFIG, DEFAULT_SNAP_SETTINGS),
  };
}
