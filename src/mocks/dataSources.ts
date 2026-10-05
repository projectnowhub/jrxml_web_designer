// Dummy sources for the "Table Data" list until the backend API is ready.
// Dates are ISO strings (YYYY-MM-DD), as the API is expected to send them.

import type { DataRow, DataSourceSchema } from "@/types/dataSource";

export interface MockDataSource extends DataSourceSchema {
  rows: DataRow[];
}

// Each row is written as its values, in the source's column order
const toRows = (keys: string[], values: (string | number)[][]): DataRow[] =>
  values.map((row) => Object.fromEntries(keys.map((key, i) => [key, row[i] ?? null])));

const procurementRows = toRows(["po_number", "vendor_name", "status", "quantity", "amount", "order_date"], [
  ["PO-1001", "Apex Supplies", "Approved", 120, 15840.5, "2026-01-05"],
  ["PO-1002", "Nordic Metals", "Pending", 40, 9200, "2026-01-09"],
  ["PO-1003", "Sunrise Traders", "Approved", 300, 4500, "2026-01-14"],
  ["PO-1004", "Apex Supplies", "Rejected", 15, 2775.25, "2026-01-20"],
  ["PO-1005", "Global Parts Co", "Approved", 75, 18750, "2026-01-27"],
  ["PO-1006", "Orchid Packaging", "Pending", 500, 3250, "2026-02-02"],
  ["PO-1007", "Nordic Metals", "Approved", 60, 13800, "2026-02-08"],
  ["PO-1008", "Sunrise Traders", "Delivered", 220, 3300, "2026-02-13"],
  ["PO-1009", "Global Parts Co", "Pending", 18, 4860, "2026-02-19"],
  ["PO-1010", "Apex Supplies", "Delivered", 90, 11880, "2026-02-24"],
  ["PO-1011", "Orchid Packaging", "Approved", 1000, 6100, "2026-03-03"],
  ["PO-1012", "Nordic Metals", "Rejected", 25, 5750, "2026-03-07"],
  ["PO-1013", "Sunrise Traders", "Approved", 410, 6150, "2026-03-12"],
  ["PO-1014", "Global Parts Co", "Delivered", 32, 8640, "2026-03-18"],
  ["PO-1015", "Apex Supplies", "Pending", 150, 19800, "2026-03-23"],
  ["PO-1016", "Orchid Packaging", "Delivered", 750, 4575, "2026-03-29"],
  ["PO-1017", "Nordic Metals", "Approved", 80, 18400, "2026-04-04"],
  ["PO-1018", "Sunrise Traders", "Pending", 260, 3900, "2026-04-10"],
  ["PO-1019", "Global Parts Co", "Approved", 45, 12150, "2026-04-15"],
  ["PO-1020", "Apex Supplies", "Delivered", 110, 14520, "2026-04-21"],
]);

const productRows = toRows(["sku", "product_name", "category", "unit_price", "stock_qty"], [
  ["SKU-A100", "Steel Bracket", "Hardware", 12.5, 840],
  ["SKU-A101", "Hex Bolt M8", "Hardware", 0.35, 12000],
  ["SKU-A102", "Copper Wire 2mm", "Electrical", 48, 230],
  ["SKU-A103", "Circuit Breaker 20A", "Electrical", 32.9, 145],
  ["SKU-A104", "Safety Helmet", "Safety", 18, 410],
  ["SKU-A105", "Hi-Vis Vest", "Safety", 9.75, 620],
  ["SKU-A106", "Cardboard Box L", "Packaging", 1.2, 5400],
  ["SKU-A107", "Bubble Wrap Roll", "Packaging", 22, 95],
  ["SKU-A108", "LED Panel 40W", "Electrical", 64.5, 120],
  ["SKU-A109", "Work Gloves", "Safety", 4.6, 1800],
  ["SKU-A110", "Aluminium Sheet", "Hardware", 76, 60],
  ["SKU-A111", "Packing Tape", "Packaging", 2.8, 2600],
  ["SKU-A112", "Cable Ties (100)", "Electrical", 5.5, 940],
  ["SKU-A113", "Hinge 4in", "Hardware", 3.4, 1350],
  ["SKU-A114", "Ear Protectors", "Safety", 14.25, 270],
]);

const vendorRows = toRows(["vendor_code", "vendor_name", "country", "rating"], [
  ["V-01", "Apex Supplies", "Malaysia", 4.6],
  ["V-02", "Nordic Metals", "Sweden", 4.2],
  ["V-03", "Sunrise Traders", "India", 3.9],
  ["V-04", "Global Parts Co", "Singapore", 4.8],
  ["V-05", "Orchid Packaging", "Thailand", 4.1],
  ["V-06", "Harbor Logistics", "Malaysia", 3.6],
  ["V-07", "Kiwi Tools", "New Zealand", 4.4],
  ["V-08", "Lotus Electricals", "Vietnam", 3.8],
  ["V-09", "Maple Industrial", "Canada", 4.5],
  ["V-10", "Desert Steelworks", "UAE", 4],
]);

export const MOCK_DATA_SOURCES: MockDataSource[] = [
  {
    id: "procurement",
    name: "Procurement",
    columns: [
      { key: "po_number", label: "PO Number", type: "text" },
      { key: "vendor_name", label: "Vendor", type: "text" },
      { key: "status", label: "Status", type: "text" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "amount", label: "Amount", type: "currency" },
      { key: "order_date", label: "Order Date", type: "date" },
    ],
    rows: procurementRows,
  },
  {
    id: "products",
    name: "Products",
    columns: [
      { key: "sku", label: "SKU", type: "text" },
      { key: "product_name", label: "Product", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "unit_price", label: "Unit Price", type: "currency" },
      { key: "stock_qty", label: "Stock", type: "number" },
    ],
    rows: productRows,
  },
  {
    id: "vendors",
    name: "Vendors",
    columns: [
      { key: "vendor_code", label: "Code", type: "text" },
      { key: "vendor_name", label: "Vendor", type: "text" },
      { key: "country", label: "Country", type: "text" },
      { key: "rating", label: "Rating", type: "number" },
    ],
    rows: vendorRows,
  },
];
