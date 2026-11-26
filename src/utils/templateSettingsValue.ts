// A template's Template Settings in the one settings format
// (TemplateSettingsValue), as the bottom panel's Template Settings JSON tab
// shows them (handed to the backend for the production default templates).
// The settings themselves are kept in the template (its JRXML, saved in this
// browser); the backend is to give them their own API.
import { getEffectiveDefaultBandConfig } from "@/constants/constants";
import { loadSnapSettings } from "@/composables/useSnapAlignment";
import { paperOf } from "@/utils/pageSetup";
import type { Band, ReportProperties } from "@/types";
import type {
  SettingsBody,
  SnapAndGridSetting,
  TemplateSettingsValue,
} from "@/types/settingsJson";

// The page part every settings JSON shares (Template Settings / Default Settings)
export interface SettingsPage {
  pageWidth: number;
  pageHeight: number;
  leftMargin: number;
  rightMargin: number;
  topMargin: number;
  bottomMargin: number;
  font?: Partial<SettingsBody["font"]>;
}

// The settings in the one format the three JSONs share (template, user default,
// developer default)
export function buildSettingsBody(
  page: SettingsPage,
  sections: string[],
  sectionHeights: SettingsBody["sectionHeights"],
  snapAndGrid: SnapAndGridSetting,
): SettingsBody {
  const font = page.font;
  return {
    paperSize: paperOf(page.pageWidth, page.pageHeight).paper,
    orientation: page.pageWidth > page.pageHeight ? "landscape" : "portrait",
    pageWidth: page.pageWidth,
    pageHeight: page.pageHeight,
    leftMargin: page.leftMargin,
    rightMargin: page.rightMargin,
    topMargin: page.topMargin,
    bottomMargin: page.bottomMargin,
    font: {
      name: font?.name ?? "",
      size: font?.size ?? 0,
      isBold: !!font?.isBold,
      isItalic: !!font?.isItalic,
      isUnderline: !!font?.isUnderline,
    },
    sections: [...sections],
    sectionHeights,
    snapAndGrid: { ...snapAndGrid },
  };
}

// The template's settings, as saved: each header / footer section's limits
// (its own, else the default ones) and height (its band's while it is on, else
// the default height)
export function buildTemplateSettingsValue(
  page: ReportProperties,
  bands: Band[],
  templateId: string,
  templateName: string,
): TemplateSettingsValue {
  const defaults = getEffectiveDefaultBandConfig();
  const sectionHeights: SettingsBody["sectionHeights"] = {};
  for (const [type, config] of Object.entries(defaults)) {
    const limit = page.bandLimits?.[type] ?? config;
    const band = bands.find((item) => item.type === type);
    sectionHeights[type] = { min: limit.min, max: limit.max, height: band ? band.height : config.defaultHeight };
  }
  return {
    templateId,
    templateName,
    ...buildSettingsBody(
      { ...page, font: page.defaultFont },
      bands.map((band) => band.type),
      sectionHeights,
      loadSnapSettings(),
    ),
  };
}
