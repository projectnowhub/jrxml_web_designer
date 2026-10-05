import { describe, it, expect } from "vitest";
import { generateJRXMLContent } from "@/utils/jrxmlGenerator";
import { parseJRXMLContent } from "@/utils/jrxml/parse";
import { ensureUniqueTableDatasets } from "@/utils/table/tableDocument";
import {
  buildThemeStyles,
  ensureThemeStyles,
  syncThemeStyles,
  tableStyleName,
} from "@/utils/table/tableThemes";
import type { Band, TableElement } from "@/types";
import type { TableDataBinding } from "@/types/dataSource";

const binding = (overrides: Partial<TableDataBinding> = {}): TableDataBinding => ({
  tableName: "Table 1",
  datasetName: "table_aaa111",
  sourceId: "procurement",
  sourceName: "Procurement",
  columns: [
    { key: "po_number", label: 'PO "No."', type: "text", width: 200 },
    { key: "amount", label: "Amount", type: "currency", width: 180, total: "sum" },
    { key: "order_date", label: "Order Date", type: "date", width: 175 },
  ],
  filters: [{ column: "status", operator: "equals", value: "Approved & <done>" }],
  filterMatch: "all",
  sort: [{ column: "amount", direction: "desc" }],
  rowLimit: 10,
  showTotals: true,
  theme: "emerald",
  ...overrides,
});

const table = (overrides: Partial<TableElement> = {}): TableElement => ({
  type: "table",
  uuid: crypto.randomUUID(),
  x: 0,
  y: 20,
  width: 555,
  height: 24 + 5 * 20 + 20,
  headerHeight: 24,
  rowHeight: 20,
  binding: binding(),
  ...overrides,
});

const detail = (...elements: any[]): Band[] => [
  { type: "detail", height: 400, elements } as Band,
];

const generate = (bands: Band[], styles: any[] = []) =>
  generateJRXMLContent(
    { name: "R", pageWidth: 595, pageHeight: 842, leftMargin: 20, rightMargin: 20, topMargin: 20, bottomMargin: 20 } as any,
    bands,
    [],
    [],
    [],
    styles,
  );

describe("data tables in JRXML", () => {
  it("writes the table's own dataset: loosely typed fields and its total variables", () => {
    const xml = generate(detail(table()));
    expect(xml).toContain('<subDataset name="table_aaa111"');
    expect(xml).toContain('<field name="po_number" class="java.lang.Object"/>');
    expect(xml).toContain('<field name="amount" class="java.lang.Number"/>');
    expect(xml).toContain('<variable name="TOTAL_2" class="java.lang.Double" calculation="Sum">');
  });

  it("writes one column per chosen source column, in schema order", () => {
    const xml = generate(detail(table()));
    expect(xml).toContain('whenNoDataType="NoDataCell"');
    expect(xml).toContain('<datasetRun subDataset="table_aaa111"');
    // header text is a Java string, quotes escaped
    expect(xml).toContain('<![CDATA["PO \\"No.\\""]]>');
    expect(xml).toContain("<![CDATA[$F{amount}]]>");
    expect(xml).toContain('pattern="#,##0.00"');
    expect(xml).toContain("<![CDATA[$V{TOTAL_2}]]>");
    expect(xml).toContain("<jr:noData");
    const column = xml.slice(xml.indexOf("<jr:column"), xml.indexOf("</jr:column>"));
    expect(column.indexOf("<jr:columnHeader")).toBeLessThan(column.indexOf("<jr:columnFooter"));
    expect(column.indexOf("<jr:columnFooter")).toBeLessThan(column.indexOf("<jr:detailCell"));
    expect(xml.match(/<jr:column /g)).toHaveLength(3);
  });

  it("styles the cells with the theme and writes the theme's styles even if none exist yet", () => {
    const xml = generate(detail(table()));
    for (const part of ["header", "row", "totals"] as const) {
      expect(xml).toContain(`<style name="${tableStyleName("emerald", part)}"`);
      expect(xml).toContain(`style="${tableStyleName("emerald", part)}"`);
    }
    expect(xml).toContain("$V{REPORT_COUNT}.intValue() % 2 == 0");
  });

  it("reads a table back exactly as it was written", () => {
    const original = table();
    const parsed = parseJRXMLContent(generate(detail(original)));
    const back = parsed.bands.find((b) => b.type === "detail")!.elements[0] as TableElement;
    expect(back.type).toBe("table");
    expect(back.binding).toEqual(original.binding);
    expect({ x: back.x, y: back.y, width: back.width, height: back.height }).toEqual({
      x: original.x,
      y: original.y,
      width: original.width,
      height: original.height,
    });
    expect([back.headerHeight, back.rowHeight]).toEqual([24, 20]);
    // its dataset is rebuilt from the setup, so it isn't kept as a separate dataset
    expect(parsed.datasets.map((d) => d.name)).not.toContain("table_aaa111");
  });

  it("keeps several tables on one source apart, each with its own filters", () => {
    const approved = table({ binding: binding() });
    const pending = table({
      y: 200,
      binding: binding({
        tableName: "Table 2",
        datasetName: "table_bbb222",
        filters: [{ column: "status", operator: "equals", value: "Pending" }],
      }),
    });
    const xml = generate(detail(approved, pending));
    expect(xml.match(/<subDataset /g)).toHaveLength(2);
    const parsed = parseJRXMLContent(xml);
    const tables = parsed.bands.find((b) => b.type === "detail")!.elements as TableElement[];
    expect(tables.map((t) => t.binding?.datasetName)).toEqual(["table_aaa111", "table_bbb222"]);
    expect(tables[1]!.binding?.filters[0]?.value).toBe("Pending");
  });

  it("keeps an empty table (no data yet) through a save and reload", () => {
    const empty = table({ binding: undefined, height: 44 });
    const xml = generate(detail(empty));
    expect(xml).not.toContain("<jr:table");
    const back = parseJRXMLContent(xml).bands.find((b) => b.type === "detail")!.elements[0] as TableElement;
    expect(back.type).toBe("table");
    expect(back.binding).toBeUndefined();
    expect(back.width).toBe(555);
  });

  it("lets items below a table move down when it grows", () => {
    const below = { type: "textField", uuid: "t1", x: 0, y: 200, width: 100, height: 20, expression: '"Note"' };
    const above = { type: "textField", uuid: "t2", x: 0, y: 0, width: 100, height: 20, expression: '"Title"' };
    const xml = generate(detail(table({ y: 30 }), below, above));
    // The whole <reportElement ...> tag of an item
    const tag = (uuid: string) => {
      const at = xml.indexOf(`uuid="${uuid}"`);
      return xml.slice(xml.lastIndexOf("<reportElement", at), xml.indexOf(">", at));
    };
    expect(tag("t1")).toContain('positionType="Float"');
    expect(tag("t2")).not.toContain("Float");
  });
});

describe("table bookkeeping", () => {
  it("gives a pasted copy its own dataset and name", () => {
    const original = table();
    const copy = structuredClone(original);
    const bands = detail(original, copy);
    expect(ensureUniqueTableDatasets(bands)).toBe(true);
    expect(copy.binding!.datasetName).not.toBe(original.binding!.datasetName);
    expect(copy.binding!.tableName).toBe("Table 2");
    expect(original.binding!.datasetName).toBe("table_aaa111");
  });

  it("adds a theme's styles once and keeps styles the user edited", () => {
    const edited = { ...buildThemeStyles("minimal")[0]!, backcolor: "#FF0000" };
    const styles = ensureThemeStyles([edited], "minimal");
    expect(styles).toHaveLength(3);
    expect(styles[0]!.backcolor).toBe("#FF0000");
    expect(ensureThemeStyles(styles, "minimal")).toBe(styles);
  });

  it("keeps only the styles of themes the tables use, unless the user changed them", () => {
    const all = ["corporateBlue", "minimal", "emerald"].flatMap((th) => buildThemeStyles(th as any));
    const names = (styles: { name: string }[]) => styles.map((s) => s.name);
    expect(names(syncThemeStyles(all, ["minimal"]))).toEqual(names(buildThemeStyles("minimal")));
    const edited = all.map((s) => (s.name === tableStyleName("emerald", "header") ? { ...s, backcolor: "#000000" } : s));
    expect(names(syncThemeStyles(edited, []))).toEqual([tableStyleName("emerald", "header")]);
    const own = { name: "Heading", fontSize: 14 };
    expect(syncThemeStyles([own], ["emerald"])).toHaveLength(4);
  });

  it("recognises an unchanged theme style after a save and reload", () => {
    const others = [...buildThemeStyles("minimal"), ...buildThemeStyles("corporateBlue")];
    const xml = generate(detail(table()), others);
    const styles = parseJRXMLContent(xml).styles;
    // the emerald table keeps its styles; the unused, unchanged others go
    expect(syncThemeStyles(styles, ["emerald"]).map((s) => s.name)).toEqual(
      buildThemeStyles("emerald").map((s) => s.name),
    );
  });

  it("drops the old table styles (Table_TH, Table_CH, Table_TD) on import", () => {
    const old = ["Table", "Table_TH", "Table_CH", "Table_TD", "Table 1_TD"].map((name) => ({ name }));
    const xml = generate(detail(), [...old, { name: "Heading", fontSize: 14 }]);
    expect(parseJRXMLContent(xml).styles.map((s) => s.name)).toEqual(["Heading"]);
  });
});
