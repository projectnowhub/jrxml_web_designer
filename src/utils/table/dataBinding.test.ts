import { describe, it, expect } from "vitest";
import {
  createDatasetName,
  distributeColumnWidths,
  maxColumnsForWidth,
  nextTableName,
  parseBinding,
  serializeBinding,
  toDataQuery,
} from "./dataBinding";
import type { TableDataBinding } from "@/types/dataSource";

const binding: TableDataBinding = {
  tableName: "Table 1",
  datasetName: "table_abc123",
  sourceId: "procurement",
  sourceName: "Procurement",
  columns: [
    { key: "po_number", label: "PO", type: "text", width: 100 },
    { key: "amount", label: "Amount", type: "currency", width: 100, total: "sum" },
  ],
  filters: [{ column: "status", operator: "equals", value: "Approved" }],
  filterMatch: "all",
  sort: [{ column: "amount", direction: "desc" }],
  rowLimit: 10,
  showTotals: true,
  theme: "emerald",
};

describe("data table helpers", () => {
  it("limits columns by width: 60pt each", () => {
    expect(maxColumnsForWidth(555)).toBe(9); // A4 portrait printable width
    expect(maxColumnsForWidth(802)).toBe(13); // A4 landscape
    expect(maxColumnsForWidth(30)).toBe(1);
  });

  it("shares the width in whole numbers that add up exactly", () => {
    const widths = distributeColumnWidths(4, 555);
    expect(widths).toEqual([139, 139, 139, 138]);
    expect(widths.reduce((a, b) => a + b, 0)).toBe(555);
    expect(distributeColumnWidths(0, 555)).toEqual([]);
  });

  it("names new tables with the lowest free number", () => {
    expect(nextTableName([])).toBe("Table 1");
    expect(nextTableName(["Table 1", "Table 3"])).toBe("Table 2");
  });

  it("gives every table its own dataset name", () => {
    const names: string[] = [];
    for (let i = 0; i < 50; i++) names.push(createDatasetName(names));
    expect(new Set(names).size).toBe(50);
    expect(names.every((n) => /^table_[0-9a-f]{6}$/.test(n))).toBe(true);
  });

  it("builds the row request, using the smaller of the table's and the preview's limit", () => {
    expect(toDataQuery(binding)).toEqual({
      columns: ["po_number", "amount"],
      filters: binding.filters,
      filterMatch: "all",
      sort: binding.sort,
      limit: 10,
    });
    expect(toDataQuery(binding, 5).limit).toBe(5);
    expect(toDataQuery({ ...binding, rowLimit: undefined }, 500).limit).toBe(500);
    expect(toDataQuery({ ...binding, rowLimit: undefined }).limit).toBeUndefined();
  });

  it("saves and reads back a binding unchanged", () => {
    expect(parseBinding(serializeBinding(binding))).toEqual(binding);
  });

  it("treats unreadable saved bindings as an unlinked table", () => {
    expect(parseBinding(undefined)).toBeNull();
    expect(parseBinding("not json")).toBeNull();
    expect(parseBinding(JSON.stringify({ sourceId: "x" }))).toBeNull();
  });

  it("fills in missing optional parts with defaults", () => {
    const minimal = JSON.stringify({ datasetName: "table_x", sourceId: "vendors", columns: [] });
    expect(parseBinding(minimal)).toMatchObject({
      filters: [],
      filterMatch: "all",
      sort: [],
      showTotals: false,
      theme: "corporateBlue",
      sourceName: "vendors",
    });
  });
});
