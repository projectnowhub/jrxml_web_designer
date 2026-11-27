// The settings JSONs the bottom panel shows (the user's Default Settings, the
// developer defaults): one format, only who they belong to differs. The
// user's are saved with their account (cdp_UserReportTemplateSetting, the
// whole UserDefaultSettings as a JSON text in `value`) and kept in this
// browser. A template's own settings are kept in its JRXML (see
// jrxml/templateSettingsXml.ts).
import type { FontSettings } from "@/types";

// The header's Snap & grid switches
export interface SnapAndGridSetting {
  snapToGrid: boolean;
  snapToAlignment: boolean;
  showGrid: boolean;
}

// The settings themselves, in one format for both JSONs (user default,
// developer default); only who they belong to differs
export interface SettingsBody {
  // Paper: its size by name ("A4", "Letter"… or "Custom") and its orientation,
  // with the page's width and height in px (what is applied)
  paperSize: string;
  orientation: "portrait" | "landscape";
  pageWidth: number;
  pageHeight: number;
  // Page Margins
  leftMargin: number;
  rightMargin: number;
  topMargin: number;
  bottomMargin: number;
  // Font
  font: FontSettings;
  // Page Sections, in page order (Detail always)
  sections: string[];
  // Section Heights of the header / footer sections: limits and height (Detail takes the page's rest)
  sectionHeights: Record<string, { min: number; max: number; height: number }>;
  // Snap & grid switches
  snapAndGrid: SnapAndGridSetting;
}

// "user default settings": what new templates start with, set by the user
export interface UserDefaultSettings extends SettingsBody {
  userId: string;
  userName: string;
}

// What the app comes with, set only in code (shown, never saved)
export interface DeveloperDefaultSettings extends SettingsBody {
  name: string;
}

// GET /v1/user-report-template-settings/current: the signed-in user's row;
// `value` = their UserDefaultSettings as a JSON text (empty until first saved)
export interface UserReportTemplateSetting {
  id?: string;
  tenantId?: string | null;
  value?: string | null;
  version?: number;
}

// PUT /rest/entities/cdp_UserReportTemplateSetting/{id}: the user's tenant
// (the server refuses the save without it) and the whole settings JSON as text
export interface UserReportTemplateSettingUpdate {
  tenantId: string;
  value: string;
}
