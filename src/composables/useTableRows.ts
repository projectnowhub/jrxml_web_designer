// Rows for a data table, fetched with its own columns/filters/sort through
// TanStack Query (queries/dataSourceQueries.ts), so redrawing a table, or several
// tables asking for the same rows, doesn't call the backend again.

import { computed, type Ref } from "vue";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/vue-query";
import { fetchRows, rowsQuery, tableTotalQuery, tableTotalRequests } from "@/queries/dataSourceQueries";
import { toDataQuery } from "@/utils/table/dataBinding";
import { hasTotalsRow } from "@/utils/table/dataTable";
import type { DataQuery, DataQueryResult, DataRow, TableDataBinding, TableTotals } from "@/types/dataSource";

export function fetchTableRows(binding: TableDataBinding, limit?: number): Promise<DataQueryResult> {
  return fetchRows(binding.projectId, binding.sourceId, toDataQuery(binding, limit));
}

const NO_QUERY = {} as DataQuery;

export function useTableRows(binding: Ref<TableDataBinding | undefined>, limit?: number) {
  // Same key while only widths or the theme change, so nothing is fetched then
  const query = useQuery(
    computed(() => {
      const current = binding.value;
      return {
        ...rowsQuery(current?.projectId ?? "", current?.sourceId ?? "", current ? toDataQuery(current, limit) : NO_QUERY),
        enabled: !!current,
        // While the next rows load, the table keeps showing the last ones
        placeholderData: keepPreviousData,
      };
    }),
  );

  const rows = computed<DataRow[]>(() => (binding.value ? (query.data.value?.rows ?? []) : []));
  const totalCount = computed(() => (binding.value ? (query.data.value?.totalCount ?? 0) : 0));
  const loading = computed(() => !!binding.value && query.isFetching.value);
  const failed = computed(() => !!binding.value && query.isError.value);

  return { rows, totalCount, loading, failed, reload: () => query.refetch() };
}

// A table's totals row (backend totals over every matching row); empty until known
// (one request per total column, each cached on its own)
export function useTableTotals(binding: Ref<TableDataBinding | null | undefined>) {
  const wanted = computed(() => {
    const current = binding.value;
    return current && hasTotalsRow(current) ? { binding: current, totals: tableTotalRequests(current) } : null;
  });
  const queries = useQueries({
    queries: computed(() =>
      (wanted.value?.totals ?? []).map(({ request }) =>
        tableTotalQuery(wanted.value!.binding.projectId, wanted.value!.binding.sourceId, request),
      ),
    ),
  });
  const totals = computed<TableTotals>(() =>
    Object.fromEntries((wanted.value?.totals ?? []).map(({ column }, i) => [column.key, queries.value[i]?.data ?? null])),
  );
  const loading = computed(() => queries.value.some((q) => q.isFetching));
  return { totals, loading };
}
