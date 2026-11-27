// The Template Settings the <jasperReport> attributes can't hold, kept in the
// template's JRXML as report properties (paper size and margins are its own
// attributes; page sections and their heights are the bands):
// - com.cdp.font: the font new text starts with, {"name":"Noto Sans SC","size":10}
// - com.cdp.sectionLimits: each header / footer section's smallest and largest
//   height, {"pageHeader":{"min":20,"max":70}, …}
// Always written in full, so a template never follows a later change to the
// user's Default Settings. A JRXML without them (another tool's) takes the
// Default Settings when opened. The paper's name isn't kept: it follows from
// the width and height (paperOf in utils/pageSetup.ts).
import { DEVELOPER_DEFAULT_BAND_CONFIG, getEffectiveDefaultBandLimits } from "@/constants/constants";
import type { FontSettings } from "@/types";

export const TEMPLATE_FONT_PROPERTY = "com.cdp.font";
export const SECTION_LIMITS_PROPERTY = "com.cdp.sectionLimits";

export type SectionLimits = Record<string, { min: number; max: number }>;

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function readJson(value: string | null | undefined): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

/** The font as the property's value, or null when there is no usable font */
export function serializeTemplateFont(font: Partial<FontSettings> | undefined): string | null {
  if (!font || !isNumber(font.size) || font.size <= 0) return null;
  return JSON.stringify({ ...(font.name ? { name: font.name } : {}), size: font.size });
}

/** The font read back; a missing name is left to the caller's default */
export function parseTemplateFont(value: string | null | undefined): Partial<FontSettings> | undefined {
  const raw = readJson(value) as { name?: unknown; size?: unknown } | undefined;
  if (!raw || !isNumber(raw.size) || raw.size <= 0) return undefined;
  return { ...(typeof raw.name === "string" && raw.name ? { name: raw.name } : {}), size: raw.size };
}

/** Every header / footer section's limits (the template's own, else the defaults) */
export function serializeSectionLimits(limits: SectionLimits | undefined): string {
  const defaults = getEffectiveDefaultBandLimits();
  const written: SectionLimits = {};
  for (const type of Object.keys(DEVELOPER_DEFAULT_BAND_CONFIG)) {
    const own = limits?.[type];
    const limit = own && isNumber(own.min) && isNumber(own.max) ? own : defaults[type];
    if (limit) written[type] = { min: limit.min, max: limit.max };
  }
  return JSON.stringify(written);
}

/** The limits read back: only known sections with a usable min and max */
export function parseSectionLimits(value: string | null | undefined): SectionLimits | undefined {
  const raw = readJson(value) as Record<string, { min?: unknown; max?: unknown }> | undefined;
  if (!raw || typeof raw !== "object") return undefined;
  const limits: SectionLimits = {};
  for (const type of Object.keys(DEVELOPER_DEFAULT_BAND_CONFIG)) {
    const item = raw[type];
    if (item && isNumber(item.min) && isNumber(item.max) && item.min >= 0 && item.max >= item.min) {
      limits[type] = { min: item.min, max: item.max };
    }
  }
  return Object.keys(limits).length ? limits : undefined;
}
