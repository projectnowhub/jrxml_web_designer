// The settings JSONs the bottom panel shows (Template Settings, the user's
// Default Settings, the developer defaults): one format, only who they belong
// to differs. Kept in this browser for now; the backend is to give them their
// own API.

// The header's Snap & grid switches
export interface SnapAndGridSetting {
  snapToGrid: boolean;
  snapToAlignment: boolean;
  showGrid: boolean;
}

// The settings themselves, in one format for the three JSONs (template, user
// default, developer default); only who they belong to differs
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
  font: { name: string; size: number; isBold: boolean; isItalic: boolean; isUnderline: boolean };
  // Page Sections, in page order (Detail always)
  sections: string[];
  // Section Heights of the header / footer sections: limits and height (Detail takes the page's rest)
  sectionHeights: Record<string, { min: number; max: number; height: number }>;
  // Snap & grid switches
  snapAndGrid: SnapAndGridSetting;
}

// "template settings <template id>": a template's own settings, read back by the row's id
export interface TemplateSettingsValue extends SettingsBody {
  // The template the row belongs to (a copied template must not take another's row)
  templateId: string;
  templateName: string;
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
