// The user's saved settings (GET /v2/table/cdp_PropertiesConfig, PUT
// /v2/properties-config): one row per app and key, its value a text. The CDP
// app keeps its own there; this app's default settings are one row, appName
// CDP_REPORT_STUDIO, key "user default settings" (constants/userSettingsConstants.ts),
// its value the JSON below.

import type { ReportDefaults } from "@/utils/reportDefaults";

// A row as cdp-fe-app's PropertiesConfigRow (packages/core/api/src/propertieconfig/types.ts),
// plus the app it belongs to
export interface PropertiesConfigRow {
  id: string;
  key: string;
  value: string;
  appName?: string;
}

// What PUT /v2/properties-config takes
export interface PropertiesConfigSave {
  appName: string;
  key: string;
  value: string;
}

// A section's height limits (Default Settings → Section Heights)
export interface SectionHeightSetting {
  min: number;
  max: number;
  defaultHeight?: number;
}

// The header's Snap & grid switches
export interface SnapAndGridSetting {
  snapToGrid: boolean;
  snapToAlignment: boolean;
  showGrid: boolean;
}

// The value of "user default settings": what the user set as their own;
// a part left out means the app's original settings
export interface UserDefaultSettings {
  version: number;
  // Default Settings (bottom panel): paper, margins, font, page sections
  reportDefaults?: ReportDefaults;
  // Default Settings (bottom panel): Section Heights
  sectionHeights?: Record<string, SectionHeightSetting>;
  // Header: Snap & grid
  snapAndGrid?: SnapAndGridSetting;
}
