// Rows for a data table, fetched with its own columns/filters/sort through
// TanStack Query (queries/dataSourceQueries.ts), so redrawing a table, or several
// tables asking for the same rows, doesn't call the backend again.

import { computed, type Ref } from "vue";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import { fetchRows, rowsQuery } from "@/queries/dataSourceQueries";
import { toDataQuery } from "@/utils/table/dataBinding";
import type { DataQuery, DataQueryResult, DataRow, TableDataBinding } from "@/types/dataSource";

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
