import { describe, it, expect, beforeEach, vi } from "vitest";

// The real client loads the router (and every view); dummy data never calls it
vi.mock("./apiClient", () => ({ default: { get: vi.fn(), post: vi.fn() } }));

import {
  clearSchemaCache,
  getSchema,
  listSources,
  queryRows,
  usesMockDataSources,
} from "./dataSourceService";

describe("dataSourceService (dummy data)", () => {
  beforeEach(() => clearSchemaCache());

  it("uses dummy data while no API is configured", () => {
    expect(usesMockDataSources()).toBe(true);
  });

  it("lists the sources with their row counts", async () => {
    expect(await listSources()).toEqual([
      { id: "procurement", name: "Procurement", rowCount: 20 },
      { id: "products", name: "Products", rowCount: 15 },
      { id: "vendors", name: "Vendors", rowCount: 10 },
    ]);
  });

  it("fetches a source's columns once, however many tables ask", async () => {
    const [a, b] = await Promise.all([getSchema("products"), getSchema("products")]);
    expect(a).toBe(b);
    expect(a.columns.map((c) => c.key)).toEqual(["sku", "product_name", "category", "unit_price", "stock_qty"]);
  });

  it("returns filtered rows; two tables on one source get their own results", async () => {
    const base = { columns: ["po_number", "status"], filterMatch: "all" as const, sort: [] };
    const [approved, pending] = await Promise.all([
      queryRows("procurement", { ...base, filters: [{ column: "status", operator: "equals", value: "Approved" }] }),
      queryRows("procurement", { ...base, filters: [{ column: "status", operator: "equals", value: "Pending" }] }),
    ]);
    expect(approved.rows.every((r) => r.status === "Approved")).toBe(true);
    expect(pending.rows.every((r) => r.status === "Pending")).toBe(true);
    expect(approved.totalCount + pending.totalCount).toBeLessThan(20);
  });

  it("rejects an unknown source", async () => {
    await expect(getSchema("nope")).rejects.toThrow("Unknown data source");
  });

  it("stops when the request is cancelled", async () => {
    const controller = new AbortController();
    const pending = queryRows("vendors", { columns: [], filters: [], filterMatch: "all", sort: [] }, controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow();
  });
});
