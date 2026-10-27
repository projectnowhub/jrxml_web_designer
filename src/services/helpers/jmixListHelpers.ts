// Jmix list helpers: the query string of a list request and how its answer is
// read, the way cdp-fe-app's createJmixCrudService().list() does
// (packages/core/api/src/jmix/createJmixCrudService.ts). No API calls here.
//
//   GET /v2/table/{entityName}?limit&offset&fetchPlanName&returnCount=true&dynamicAttributes&filter&sort
// `filter` is a Jmix filter as JSON; `sort` is "name" or "-name" (descending),
// comma-separated. The rows come back as a list (bare or wrapped as
// { data, message, status }), the total of all matching rows in the
// x-total-count header.

import { unwrap } from "../apiClient";
import { JMIX_PAGE_SIZE } from "@/constants/reportDataConstants";
import type { ApiResponse } from "@/types/api";
import type { JmixListParams, JmixListResponse, JmixSort } from "@/types/jmix";

const toJmixSortParam = (sort: JmixSort[]): string =>
  sort.map((s) => `${s.desc ? "-" : ""}${s.id.replace("+", "")}`).join(",");

// The query string of a list request. /v2/table names the fetch plan
export function buildJmixListQuery(params: JmixListParams, fetchPlanParam = "fetchPlanName"): URLSearchParams {
  const { limit = JMIX_PAGE_SIZE, offset = 0, filter, sort, fetchPlan, dynamicAttributes } = params;
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset), returnCount: "true" });
  if (fetchPlan) query.set(fetchPlanParam, fetchPlan);
  if (dynamicAttributes) query.set("dynamicAttributes", "true");
  if (filter) query.set("filter", JSON.stringify(filter));
  if (sort?.length) query.set("sort", toJmixSortParam(sort));
  return query;
}

// A list answer as rows + total + whether more pages follow
export function readJmixListResponse<TRow>(
  entityName: string,
  data: ApiResponse<TRow[]>,
  headers: Headers,
  { limit = JMIX_PAGE_SIZE, offset = 0 }: JmixListParams,
): JmixListResponse<TRow> {
  const rows = unwrap(data);
  if (!Array.isArray(rows)) throw new Error(`The ${entityName} list is not a list`);
  // Without the header (not exposed to the browser), a full page may have more after it
  const counted = headers.get("x-total-count");
  if (counted === null) return { rows, total: offset + rows.length, hasMore: rows.length >= limit };
  const total = Number(counted);
  return { rows, total, hasMore: offset + rows.length < total };
}
