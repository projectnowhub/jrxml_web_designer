// Lists of CDP entities, asked for the way cdp-fe-app's createJmixCrudService()
// list() does (packages/core/api/src/jmix/createJmixCrudService.ts):
//   GET {VITE_API_BASE_URL}/v2/table/{entityName}
//       ?limit&offset&fetchPlanName&returnCount=true&dynamicAttributes&filter&sort
// The rows come back as a list (bare or wrapped as { data, message, status }),
// the total of all matching rows in the x-total-count header. `filter` is a
// Jmix filter as JSON; `sort` is "name" or "-name" (descending), comma-separated.

import apiClient, { unwrap } from "./apiClient";
import { API_ROUTES } from "@/config/apiConfig";
import type { Entity } from "@/types/entity";
import type { JmixFilter } from "@/types/dataSource";

export interface JmixListParams {
  limit?: number;
  offset?: number;
  filter?: JmixFilter;
  sort?: { id: string; desc: boolean }[];
  fetchPlan?: string;
  dynamicAttributes?: boolean;
}

export interface JmixListResponse<TRow> {
  rows: TRow[];
  total: number;
  hasMore: boolean;
}

// The page size the CDP app's lists use
export const JMIX_PAGE_SIZE = 30;

const toSortParam = (sort: { id: string; desc: boolean }[]): string =>
  sort.map((s) => `${s.desc ? "-" : ""}${s.id.replace("+", "")}`).join(",");

// `entityName`: one of Entity, or any name /v2/entities gives
export async function jmixList<TRow>(
  entityName: Entity | (string & {}),
  params: JmixListParams = {},
  signal?: AbortSignal,
): Promise<JmixListResponse<TRow>> {
  const { limit = JMIX_PAGE_SIZE, offset = 0, filter, sort, fetchPlan, dynamicAttributes } = params;

  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    returnCount: "true",
  });
  if (fetchPlan) query.set("fetchPlanName", fetchPlan);
  if (dynamicAttributes) query.set("dynamicAttributes", "true");
  if (filter) query.set("filter", JSON.stringify(filter));
  if (sort?.length) query.set("sort", toSortParam(sort));

  const { data, headers } = await apiClient.requestWithHeaders<unknown>(
    `${API_ROUTES.table}/${encodeURIComponent(entityName)}?${query}`,
    { method: "GET", signal },
  );
  const rows = unwrap<TRow[]>(data);
  if (!Array.isArray(rows)) throw new Error(`The ${entityName} list is not a list`);
  // Without the header (not exposed to the browser), a full page may have more after it
  const counted = headers.get("x-total-count");
  if (counted === null) {
    return { rows, total: offset + rows.length, hasMore: rows.length >= limit };
  }
  const total = Number(counted);
  return { rows, total, hasMore: offset + rows.length < total };
}
