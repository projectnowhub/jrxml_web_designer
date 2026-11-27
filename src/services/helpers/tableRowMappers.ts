// Table-row mappers: how a record's values print in a table cell. No API
// calls here.

import i18n from "@/i18n";
import type { JmixValue } from "@/types/jmix";

// What a cell prints: numbers and text as they are, yes / no in the app's
// language, a linked record by its name
export function toTableCellValue(value: JmixValue | undefined): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "boolean") return i18n.global.t(value ? "dataTable.yes" : "dataTable.no");
  if (Array.isArray(value)) return value.map(toTableCellValue).filter((v) => v !== null && v !== "").join(", ");
  const name = value._instanceName ?? value.name ?? value.title;
  return typeof name === "string" ? name : null;
}

