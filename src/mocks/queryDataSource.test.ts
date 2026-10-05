import { describe, it, expect } from "vitest";
import { queryRows, isActiveFilter } from "./queryDataSource";
import { MOCK_DATA_SOURCES } from "./dataSources";
import type { DataQuery } from "@/types/dataSource";

const procurement = MOCK_DATA_SOURCES.find((s) => s.id === "procurement")!;
const run = (query: Partial<DataQuery>) =>
  queryRows(procurement.rows, procurement.columns, {
    columns: [],
    filters: [],
    filterMatch: "all",
    sort: [],
    ...query,
  });

describe("dummy data sources", () => {
  it("have the planned sizes and every row has every column", () => {
    const sizes = MOCK_DATA_SOURCES.map((s) => [s.id, s.columns.length, s.rows.length]);
    expect(sizes).toEqual([
      ["procurement", 6, 20],
      ["products", 5, 15],
      ["vendors", 4, 10],
    ]);
    for (const source of MOCK_DATA_SOURCES) {
      for (const row of source.rows) {
        expect(Object.keys(row).sort()).toEqual(source.columns.map((c) => c.key).sort());
      }
    }
  });
});

describe("queryRows (dummy)", () => {
  it("returns every row and column without a query", () => {
    const result = run({});
    expect(result.totalCount).toBe(20);
    expect(result.rows).toHaveLength(20);
    expect(Object.keys(result.rows[0])).toHaveLength(6);
  });

  it("returns only the chosen columns, in the chosen order", () => {
    const result = run({ columns: ["amount", "po_number"] });
    expect(Object.keys(result.rows[0])).toEqual(["amount", "po_number"]);
  });

  it("filters text case-insensitively", () => {
    const result = run({ filters: [{ column: "status", operator: "equals", value: "approved" }] });
    expect(result.totalCount).toBe(8);
    expect(result.rows.every((r) => r.status === "Approved")).toBe(true);
  });

  it("filters numbers, including between in either order", () => {
    expect(run({ filters: [{ column: "amount", operator: "greaterThan", value: "15000" }] }).totalCount).toBe(4);
    const between = run({ filters: [{ column: "quantity", operator: "between", value: "100", value2: "50" }] });
    expect(between.rows.every((r) => Number(r.quantity) >= 50 && Number(r.quantity) <= 100)).toBe(true);
    expect(between.totalCount).toBe(4);
  });

  it("filters dates", () => {
    const result = run({ filters: [{ column: "order_date", operator: "before", value: "2026-02-01" }] });
    expect(result.totalCount).toBe(5);
    expect(run({ filters: [{ column: "order_date", operator: "on", value: "2026-03-12" }] }).rows[0].po_number).toBe("PO-1013");
  });

  it("combines filters with all (AND) or any (OR)", () => {
    const filters = [
      { column: "status", operator: "equals" as const, value: "Pending" },
      { column: "vendor_name", operator: "equals" as const, value: "Apex Supplies" },
    ];
    expect(run({ filters, filterMatch: "all" }).totalCount).toBe(1);
    expect(run({ filters, filterMatch: "any" }).totalCount).toBe(9);
  });

  it("ignores filters that are still being filled in", () => {
    expect(isActiveFilter({ column: "status", operator: "equals", value: "" })).toBe(false);
    expect(isActiveFilter({ column: "quantity", operator: "between", value: "1" })).toBe(false);
    expect(isActiveFilter({ column: "status", operator: "isEmpty" })).toBe(true);
    expect(run({ filters: [{ column: "status", operator: "equals", value: "" }] }).totalCount).toBe(20);
  });

  it("sorts by several columns, each in its own direction", () => {
    const rows = run({
      sort: [
        { column: "vendor_name", direction: "asc" },
        { column: "amount", direction: "desc" },
      ],
    }).rows;
    expect(rows[0].vendor_name).toBe("Apex Supplies");
    expect(rows.slice(0, 5).map((r) => r.amount)).toEqual([19800, 15840.5, 14520, 11880, 2775.25]);
  });

  it("applies the row limit after filtering and sorting, and still counts every match", () => {
    const result = run({ sort: [{ column: "amount", direction: "desc" }], limit: 3 });
    expect(result.rows.map((r) => r.po_number)).toEqual(["PO-1015", "PO-1005", "PO-1017"]);
    expect(result.totalCount).toBe(20);
  });
});
