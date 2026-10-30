// "Split table here": a typed table's rows from the chosen one on move to a
// new table at the top of a new page right after the table's page, with the
// heading rows copied (JasperReports can't repeat a typed table's heading on
// each page without leaving blank space after it, so the user splits it).

import type { CustomTableElement } from "@/types";
import { useReportStore } from "@/stores/report";
import { BAND_TYPE_CONSTANTS } from "@/constants/constants";
import { canSplitAt, splitTableElement } from "@/utils/customTable";
import { pageKind, shiftPages } from "@/utils/specialPages";

// Where a typed table can be split: on a normal page's Detail section
export function splitPlace(element: CustomTableElement): { pageIndex: number } | null {
  const report = useReportStore();
  const detail = report.bands.find((b) => b.type === BAND_TYPE_CONSTANTS.DETAIL);
  if (!detail?.elements.includes(element)) return null;
  const pageIndex = element.pageIndex ?? 0;
  if (pageKind(report.reportProperties, pageIndex) !== "normal") return null;
  return { pageIndex };
}

export const canSplitTypedTable = (element: CustomTableElement, at: number) =>
  !!splitPlace(element) && canSplitAt(element.table, at);

// One undo step; returns the new table (on the new page) or null
export function splitTypedTable(element: CustomTableElement, at: number): CustomTableElement | null {
  const place = splitPlace(element);
  if (!place || !canSplitAt(element.table, at)) return null;
  const report = useReportStore();
  const detail = report.bands.find((b) => b.type === BAND_TYPE_CONSTANTS.DETAIL)!;
  report.saveStateToHistory();
  const moved = splitTableElement(element, at);
  // A new page right after this one: later pages move down one
  const total = report.totalPages;
  const newPage = place.pageIndex + 1;
  shiftPages(detail.elements, newPage, 1);
  report.pageCount = total + 1;
  moved.pageIndex = newPage;
  detail.elements.push(moved);
  report.updateJrxml();
  return moved;
}
