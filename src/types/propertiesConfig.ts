// The CDP app's saved settings (GET /rest/entities/cdp_PropertiesConfig): one
// row per key, its value a text. A table's row (key "procurement-table-v2"…)
// holds its grid state as JSON, written by the CDP app's grid (reaktiform
// 1.2.17, PersistedGridState); copied field for field.

// A row as cdp-fe-app's PropertiesConfigRow (packages/core/api/src/propertieconfig/types.ts)
export interface PropertiesConfigRow {
  id: string;
  key: string;
  value: string;
}

// ---- A table's grid state (reaktiform's PersistedGridState) ---------------------

export type GridTextFilterValue = { type: "text"; value: string };
export type GridNumberFilterValue = { type: "number"; min?: number; max?: number };
export type GridDateFilterValue = { type: "date"; from?: string; to?: string };
export type GridTimeFilterValue = { type: "time"; from?: string; to?: string };
export type GridSelectFilterValue = { type: "select"; values: string[] };
export type GridCheckboxFilterValue = { type: "checkbox"; value: boolean | null };
export type GridFilterValue =
  | GridTextFilterValue
  | GridNumberFilterValue
  | GridDateFilterValue
  | GridTimeFilterValue
  | GridSelectFilterValue
  | GridCheckboxFilterValue;
export type GridActiveFilters = Record<string, GridFilterValue>;

export type GridCFConditionOperator = "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains" | "in";
export type GridCFCondition = { field: string; op: GridCFConditionOperator; value: string };
export type GridCFRule = {
  id: string;
  label: string;
  conditions: GridCFCondition[];
  logic: "AND" | "OR";
  backgroundColor: string;
  textColor: string;
  enabled: boolean;
};

export type GridPanelMode = "drawer" | "modal" | "page";

export type PersistedGridState = {
  version: number;
  columnWidths: Record<string, number>;
  hiddenColumns: string[];
  pinnedColumns: string[];
  // Column keys (fieldName; user-defined ones "+code"), left to right
  columnOrder: string[];
  activeFilters: GridActiveFilters;
  aggregations: Record<string, string>;
  cfRules: GridCFRule[];
  editLocked: boolean;
  panelMode?: GridPanelMode;
};
