// The few texts charts print (axis labels, "Other", month names…) and the
// locale they are formatted in. The chart code asks here instead of using the
// app's vue-i18n, so it also runs outside the app: in the report engine the
// report server runs (src/engine). The app plugs in vue-i18n in main.ts;
// the engine plugs in CHART_TEXTS below.
// Only the "chart" part of the locale files is bundled
import { chart as enChart } from "@/locales/en.json";
import { chart as msChart } from "@/locales/ms.json";

export interface ChartTextSource {
  t(key: string, params?: Record<string, unknown>): string;
  // BCP 47 tag for dates and numbers, e.g. "en-US"
  localeTag(): string;
}

// The chart texts per language, straight from the locale files
type Messages = Record<string, unknown>;
const CHART_KEYS = ["measures", "blank", "quarterLabel", "other", "yes", "no", "noData", "sample"] as const;
const pickChart = (chart: Messages) => Object.fromEntries(CHART_KEYS.map((k) => [k, chart[k]])) as Messages;

export const CHART_TEXTS: Record<string, { tag: string; messages: Messages }> = {
  en: { tag: "en-US", messages: pickChart(enChart) },
  ms: { tag: "ms-MY", messages: pickChart(msChart) },
};

// "chart.measures.sumOf" with { column: "Amount" } → "Total Amount"
function lookup(messages: Messages, key: string, params: Record<string, unknown> = {}): string {
  const path = key.replace(/^chart\./, "").split(".");
  let value: unknown = messages;
  for (const part of path) value = (value as Messages | undefined)?.[part];
  if (typeof value !== "string") return key;
  return value.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

// Texts in one of CHART_TEXTS' languages (English when unknown)
export function chartTextsFor(locale: string): ChartTextSource {
  const lang = CHART_TEXTS[locale] ?? CHART_TEXTS.en!;
  return {
    t: (key, params) => lookup(lang.messages, key, params),
    localeTag: () => lang.tag,
  };
}

let source: ChartTextSource = chartTextsFor("en");

export function setChartTextSource(next: ChartTextSource): void {
  source = next;
}

export const chartT = (key: string, params: Record<string, unknown> = {}): string => source.t(key, params);
export const chartLocaleTag = (): string => source.localeTag();
