// Every generated JRXML must be well-formed XML: one stray "<", "&" or quote
// and the report server rejects the whole report ("The content of elements
// must consist of well-formed character data or markup"). This builds a report
// from every element the library offers, with awkward text in every place a
// user can type, and checks it with a strict XML parser.
import { describe, it, expect } from "vitest";
import { generateJRXMLContent } from "@/utils/jrxmlGenerator";
import { parseJRXMLContent } from "@/utils/jrxml/parse";
import { formatXml } from "@/utils/jrxml/formatXml";
import { createElement } from "@/components/elements/ElementRegistry";
import { buildFrameTemplate, FRAME_TEMPLATE_TYPES } from "@/utils/framePresets";
import { buildPaginationElement } from "@/utils/paginationPresets";
import { createBinding } from "@/utils/table/dataTable";
import { buildThemeStyles } from "@/utils/table/tableThemes";
import { MOCK_DATA_SOURCES } from "@/mocks/dataSources";
import type { Band } from "@/types";

const AWKWARD = `A & B < C > "D" 'E' ]]> F`;
const ELEMENT_TYPES = ["textField", "image", "line", "rectangle", "ellipse", "frame", "table", "chart", "barcode"];

const PAGE = {
  name: `Report ${AWKWARD}`,
  pageWidth: 595,
  pageHeight: 842,
  leftMargin: 20,
  rightMargin: 20,
  topMargin: 20,
  bottomMargin: 20,
} as any;

// The XML parser's complaint, or "" when the text is well-formed
function xmlError(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return doc.getElementsByTagName("parsererror")[0]?.textContent ?? "";
}

// The document without the whitespace between tags, for comparing
function withoutLayout(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3 && !child.textContent?.trim()) node.removeChild(child);
      else walk(child);
    }
  };
  walk(doc);
  return new XMLSerializer().serializeToString(doc);
}

function everyElement(): any[] {
  const ctx = { availableWidth: 555, availableHeight: 802, t: (key: string) => `${key} ${AWKWARD}` };
  const elements: any[] = ELEMENT_TYPES.map((type) => ({ ...createElement(type), uuid: crypto.randomUUID() }));
  FRAME_TEMPLATE_TYPES.forEach((type) => elements.push(buildFrameTemplate(type, ctx)));
  elements.push(buildPaginationElement(undefined, {}));

  const schema = MOCK_DATA_SOURCES[0]!;
  const binding = createBinding({ schema, tableName: `Table ${AWKWARD}`, datasetName: "table_abc123", tableWidth: 555 });
  binding.columns[0]!.label = AWKWARD;
  binding.filters = [{ column: schema.columns[0]!.key, operator: "contains", value: AWKWARD }];
  binding.showTotals = true;
  elements.push({ ...createElement("table"), uuid: crypto.randomUUID(), width: 555, binding });

  // Text a user can type
  elements.push({
    ...createElement("textField"),
    uuid: crypto.randomUUID(),
    expression: JSON.stringify(AWKWARD),
    pattern: AWKWARD,
    properties: [{ name: "com.example.note", value: AWKWARD }],
  });
  elements.push({ ...createElement("image"), uuid: crypto.randomUUID(), imagePath: AWKWARD });

  elements.forEach((element, i) => {
    element.y = i * 10;
  });
  return elements;
}

function generate(bands: Band[], styles: any[], pages = 1) {
  return generateJRXMLContent({ ...PAGE, pageCount: pages }, bands, [], [], [], styles, [], [], [], pages);
}

describe("generated JRXML is well-formed XML", () => {
  const styles = [...buildThemeStyles("corporateBlue"), { name: `Style ${AWKWARD}`, fontSize: 10 }];

  it("with every library element on one page", () => {
    const xml = generate([{ type: "detail", height: 802, elements: everyElement() } as Band], styles);
    expect(xmlError(xml)).toBe("");
  });

  it("with the elements spread over several pages and a page border", () => {
    const elements = everyElement().map((element, i) => ({ ...element, pageIndex: i % 3 }));
    const border = buildFrameTemplate("framePageBorder", { availableWidth: 555, availableHeight: 802, t: (k) => k });
    const bands = [
      { type: "background", height: 802, elements: [border] },
      { type: "detail", height: 802, elements },
    ] as Band[];
    expect(xmlError(generate(bands, styles, 3))).toBe("");
  });

  it("after a save and reload", () => {
    const xml = generate([{ type: "detail", height: 802, elements: everyElement() } as Band], styles);
    const parsed = parseJRXMLContent(xml);
    const again = generateJRXMLContent(
      PAGE,
      parsed.bands,
      parsed.fields as any,
      parsed.parameters as any,
      parsed.datasets as any,
      parsed.styles,
      parsed.variables as any,
    );
    expect(xmlError(again)).toBe("");
  });

  // The JRXML panel shows (and validates, previews and saves) the formatted text
  it("after formatting in the JRXML panel, unchanged apart from layout", () => {
    const xml = generate([{ type: "detail", height: 802, elements: everyElement() } as Band], styles);
    const formatted = formatXml(xml);
    expect(xmlError(formatted)).toBe("");
    expect(withoutLayout(formatted)).toBe(withoutLayout(xml));
    expect(formatXml(formatted)).toBe(formatted);
    // expressions are copied exactly
    expect(formatted).toContain("<![CDATA[new Boolean($V{REPORT_COUNT}");
  });
});
