// Rows for a data table, fetched with its own columns/filters/sort. Results are
// cached by request, so redrawing a table (or several tables asking for the
// same rows) doesn't call the backend again.

import { ref, watch, onBeforeUnmount, type Ref } from "vue";
import { queryRows } from "@/services/dataSourceService";
import { toDataQuery } from "@/utils/table/dataBinding";
import type { DataQueryResult, DataRow, TableDataBinding } from "@/types/dataSource";

const cache = new Map<string, Promise<DataQueryResult>>();

export function clearTableRowsCache(): void {
  cache.clear();
}

export function fetchTableRows(
  binding: TableDataBinding,
  limit?: number,
): Promise<DataQueryResult> {
  const query = toDataQuery(binding, limit);
  const key = JSON.stringify([binding.sourceId, query]);
  let result = cache.get(key);
  if (!result) {
    result = queryRows(binding.sourceId, query);
    // A failed request is tried again next time
    result.catch(() => cache.delete(key));
    cache.set(key, result);
  }
  return result;
}

export function useTableRows(
  binding: Ref<TableDataBinding | undefined>,
  limit?: number,
) {
  const rows = ref<DataRow[]>([]);
  const totalCount = ref(0);
  const loading = ref(false);
  const failed = ref(false);
  let latest = 0;

  const load = async () => {
    const current = binding.value;
    const request = ++latest;
    if (!current) {
      rows.value = [];
      totalCount.value = 0;
      return;
    }
    loading.value = true;
    failed.value = false;
    try {
      const result = await fetchTableRows(current, limit);
      // Ignore answers to an older version of the setup
      if (request !== latest) return;
      rows.value = result.rows;
      totalCount.value = result.totalCount;
    } catch {
      if (request === latest) failed.value = true;
    } finally {
      if (request === latest) loading.value = false;
    }
  };

  // Re-fetch only when what is asked for changes (not on column widths or theme)
  watch(
    () => (binding.value ? JSON.stringify([binding.value.sourceId, toDataQuery(binding.value, limit)]) : ""),
    load,
    { immediate: true },
  );
  onBeforeUnmount(() => {
    latest++;
  });

  return { rows, totalCount, loading, failed, reload: load };
}
