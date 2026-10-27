// The column order of each project-data table, as the user arranged it in
// the CDP app. Read once at login like the CDP app does (propertiesConfigSync.ts):
// every saved setting is copied into this browser's storage under its own key
// ("procurement-table-v2" = that table's grid state, JSON). The Report Data
// list, the table setup popup and new tables then show the columns in that
// order. A reorder in the designer's table setup is kept in this browser only
// (never sent back to the CDP app); the next login brings the CDP app's again.
import { defineStore } from "pinia";
import { ref } from "vue";
import { getPropertiesConfig } from "@/services/propertiesConfigService";
import {
  CDP_GRID_STATE_VERSION,
  CDP_TABLE_STORAGE_KEYS,
  PROPERTIES_CONFIG_META_KEY,
} from "@/constants/reportDataConstants";
import type { PersistedGridState } from "@/types/propertiesConfig";

// Where an entity's grid state is kept: its CDP table's key, else (an entity
// the CDP app has no table for) one of the designer's own
const storageKeyOf = (entityName: string) =>
  CDP_TABLE_STORAGE_KEYS[entityName] ?? `designer.tableColumns.${entityName}`;

// A table's saved grid state, or null (none, unreadable, or of another version)
function readGridState(storageKey: string): PersistedGridState | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const state = JSON.parse(raw) as PersistedGridState;
    return state && state.version === CDP_GRID_STATE_VERSION ? state : null;
  } catch {
    return null;
  }
}

// A new grid state holding only an order (the CDP grid's empty state)
const emptyGridState = (columnOrder: string[]): PersistedGridState => ({
  version: CDP_GRID_STATE_VERSION,
  columnWidths: {},
  hiddenColumns: [],
  pinnedColumns: [],
  columnOrder,
  activeFilters: {},
  aggregations: {},
  cfRules: [],
  editLocked: false,
});

// The full order with the table's columns put in its order, each in a place
// one of them held, so the columns it doesn't show keep their places
function withTableOrder(fullOrder: readonly string[], tableKeys: readonly string[]): string[] {
  const shown = new Set(tableKeys);
  const queue = tableKeys.filter((key) => fullOrder.includes(key));
  return fullOrder.map((key) => (shown.has(key) ? queue.shift() ?? key : key));
}

export const useColumnOrderStore = defineStore("columnOrder", () => {
  // Goes up whenever a saved order changes, so what reads them follows
  const version = ref(0);

  // An entity's column keys in the CDP app's order ([] when none is saved)
  function orderOf(entityName: string): string[] {
    void version.value;
    return readGridState(storageKeyOf(entityName))?.columnOrder ?? [];
  }

  // At login: the CDP app's saved settings into this browser, as it does
  async function syncFromServer(): Promise<void> {
    try {
      const rows = await getPropertiesConfig();
      rows.forEach((row) => localStorage.setItem(row.key, row.value));
      localStorage.setItem(
        PROPERTIES_CONFIG_META_KEY,
        JSON.stringify({ syncedAt: new Date().toISOString(), count: rows.length }),
      );
      version.value++;
    } catch (error) {
      // The columns keep the order they had: never a reason to stop the login
      console.error("Failed to sync properties config", error);
    }
  }

  // The user reordered a table's columns in the designer: keep that order in
  // this browser (allKeys = every column, in the order shown until now)
  function rememberTableOrder(entityName: string, allKeys: readonly string[], tableKeys: readonly string[]): void {
    const storageKey = storageKeyOf(entityName);
    const columnOrder = withTableOrder(allKeys, tableKeys);
    const state = readGridState(storageKey);
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(state ? { ...state, columnOrder } : emptyGridState(columnOrder)),
      );
      version.value++;
    } catch {
      // Storage off (private window): the order lasts until the page is closed
    }
  }

  return { version, orderOf, syncFromServer, rememberTableOrder };
});
