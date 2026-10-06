import type { DesignElement, BandType, Band, ReportGroup, TableElement } from "@/types";
import { TABLE_BINDING_PROPERTY, parseBinding } from "../table/dataBinding";
import { TABLE_HEADER_HEIGHT, TABLE_ROW_HEIGHT } from "../table/dataTable";
import { collectBoundTables } from "./tableXml";
import {
  BOX_CORNER_RADIUS_PROPERTY,
  decodeCornerRadii,
  decodeSidePens,
  orUndefined,
  ROUNDED_BORDER_PENS_PROPERTY,
  ROUNDED_BORDER_PROPERTY,
  ROUNDED_MARKER,
  withoutLines,
} from "../framePresets";
import { detectPagination } from "../paginationPresets";
import { SAVED_TABLE_STYLES_PROPERTY, parseSavedTableStyles } from "../table/tableThemes";
import type { SavedTableStyle } from "@/types/dataSource";
import type {
  ReportProperties,
  Field,
  Parameter,
  SubDataset,
  Variable,
} from "./types";

export function parseJRXMLContent(jrxmlContent: string): {
  properties: ReportProperties;
  bands: Band[];
  fields: Field[];
  parameters: Parameter[];
  datasets: SubDataset[];
  variables: Variable[];
  groups: ReportGroup[];
  tableStyles: SavedTableStyle[];
  reportProperties: Array<{ name: string; value: string }>;
} {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(jrxmlContent, "text/xml");

  // Use the root element directly as the jasperReport element, without strictly validating tagName, since the parser may add a namespace prefix
  const jasperReportElem = xmlDoc.documentElement;
  if (!jasperReportElem) {
    throw new Error("Invalid JRXML: Missing root element");
  }

  // Parse the main report's query string - only look at direct children
  let query: { language: string; text: string } | undefined;
  let queryStringElem = null;

  // 1. First look for a queryString among the direct children (without namespace)
  for (const child of Array.from(jasperReportElem.children)) {
    if (child.tagName === "queryString") {
      queryStringElem = child;
      break;
    }
  }

  // 2. If not found, try looking for a namespaced direct child
  if (!queryStringElem) {
    // Try using getElementsByTagNameNS to find a direct child
    const nsChildren = jasperReportElem.getElementsByTagNameNS(
      "http://jasperreports.sourceforge.net/jasperreports",
      "queryString",
    );
    if (nsChildren.length > 0) {
      // Ensure it's a direct child
      for (let i = 0; i < nsChildren.length; i++) {
        const child = nsChildren[i];
        if (child) {
          const parent = child.parentNode;
          if (parent === jasperReportElem) {
            queryStringElem = child;
            break;
          }
        }
      }
    }
  }

  // 3. If still not found, try matching a direct child by localName
  if (!queryStringElem) {
    queryStringElem =
      Array.from(jasperReportElem.children).find(
        (child) => child.localName === "queryString",
      ) || null;
  }
  if (queryStringElem) {
    const language = queryStringElem.getAttribute("language") || "sql";
    const text = queryStringElem.textContent?.trim() || "";
    query = { language, text };
  }

  const properties: ReportProperties = {
    name: jasperReportElem.getAttribute("name") || "Unnamed Report",
    pageWidth: parseInt(jasperReportElem.getAttribute("pageWidth") || "595"),
    pageHeight: parseInt(jasperReportElem.getAttribute("pageHeight") || "842"),
    leftMargin: parseInt(jasperReportElem.getAttribute("leftMargin") || "20"),
    rightMargin: parseInt(jasperReportElem.getAttribute("rightMargin") || "20"),
    topMargin: parseInt(jasperReportElem.getAttribute("topMargin") || "30"),
    bottomMargin: parseInt(
      jasperReportElem.getAttribute("bottomMargin") || "30",
    ),
    language: jasperReportElem.getAttribute("language") || "java",
    columnCount: parseInt(jasperReportElem.getAttribute("columnCount") || "1"),
    printOrder: jasperReportElem.getAttribute("printOrder") || "Vertical",
    columnDirection: jasperReportElem.getAttribute("columnDirection") || "LTR",
    orientation: jasperReportElem.getAttribute("orientation") || "Portrait",
    whenNoDataType:
      jasperReportElem.getAttribute("whenNoDataType") || "AllSectionsNoDetail",
    sectionType: jasperReportElem.getAttribute("sectionType") || "Band",
    columnWidth: parseInt(
      jasperReportElem.getAttribute("columnWidth") || "555",
    ),
    columnSpacing: parseInt(
      jasperReportElem.getAttribute("columnSpacing") || "0",
    ),
    isTitleNewPage: jasperReportElem.getAttribute("isTitleNewPage") === "true",
    isSummaryNewPage:
      jasperReportElem.getAttribute("isSummaryNewPage") === "true",
    isSummaryWithPageHeaderAndFooter:
      jasperReportElem.getAttribute("isSummaryWithPageHeaderAndFooter") ===
      "true",
    isFloatColumnFooter:
      jasperReportElem.getAttribute("isFloatColumnFooter") === "true",
    isIgnorePagination:
      jasperReportElem.getAttribute("isIgnorePagination") === "true",
    query,
  };

  const fields: Field[] = [];
  // Only collect field elements that are direct children of the root element, excluding fields inside datasets
  Array.from(jasperReportElem.children).forEach((child) => {
    if (child.tagName === "field" || child.localName === "field") {
      const name = child.getAttribute("name");
      const className = child.getAttribute("class") || "java.lang.String";
      if (name) {
        const field: Field = { name, class: className };
        // Extract the UUID (if present)
        const uuid = child.getAttribute("uuid");
        if (uuid) field.uuid = uuid;
        // Extract properties (if present)
        const properties: Record<string, string> = {};
        const propertyElems = child.querySelectorAll("property");
        propertyElems.forEach((propElem) => {
          const propName = propElem.getAttribute("name");
          const propValue = propElem.getAttribute("value");
          if (propName && propValue) {
            properties[propName] = propValue;
          }
        });
        if (Object.keys(properties).length > 0) {
          field.properties = properties;
        }
        fields.push(field);
      }
    }
  });

  const parameters: Parameter[] = [];
  // Only collect parameter elements that are direct children of the root element, excluding parameters inside datasets
  Array.from(jasperReportElem.children).forEach((child) => {
    if (child.tagName === "parameter" || child.localName === "parameter") {
      const name = child.getAttribute("name");
      const className = child.getAttribute("class") || "java.lang.String";
      if (name) {
        const param: Parameter = { name, class: className };
        // Extract the UUID (if present)
        const uuid = child.getAttribute("uuid");
        if (uuid) param.uuid = uuid;
        // Extract isForPrompting (if present; defaults to true)
        if (child.hasAttribute("isForPrompting")) {
          param.isForPrompting =
            child.getAttribute("isForPrompting") === "true";
        }
        // Extract nested (if present; defaults to false)
        if (child.hasAttribute("nested")) {
          param.nested = child.getAttribute("nested") === "true";
        }
        // Extract parameterDescription (if present)
        const descElem = child.querySelector("parameterDescription");
        if (descElem && descElem.textContent) {
          param.parameterDescription = descElem.textContent.trim();
        }
        const defaultValueExpr = child.querySelector("defaultValueExpression");
        if (defaultValueExpr && defaultValueExpr.textContent) {
          param.defaultValue = defaultValueExpr.textContent.trim();
        }
        parameters.push(param);
      }
    }
  });

  const bands: Band[] = [];
  const bandTypes = [
    "background",
    "pageHeader",
    "columnHeader",
    "detail",
    "columnFooter",
    "pageFooter",
    "lastPageFooter",
    "noData",
  ];

  bandTypes.forEach((type) => {
    // Find the band container element, accounting for namespaces
    let bandContainer = xmlDoc.querySelector(`${type}`);
    if (!bandContainer) {
      // Try getElementsByTagNameNS, converting undefined to null
      bandContainer =
        xmlDoc.getElementsByTagNameNS(
          "http://jasperreports.sourceforge.net/jasperreports",
          type,
        )[0] || null;
    }
    if (!bandContainer) {
      // Try matching all elements by localName, converting undefined to null
      const allElements = xmlDoc.getElementsByTagName("*");
      bandContainer =
        Array.from(allElements).find((element) => element.localName === type) ||
        null;
    }
    if (!bandContainer) return;

    // Find the band element, accounting for namespaces
    let bandElem = bandContainer.querySelector("band");
    if (!bandElem) {
      // Try getElementsByTagNameNS, converting undefined to null
      bandElem =
        bandContainer.getElementsByTagNameNS(
          "http://jasperreports.sourceforge.net/jasperreports",
          "band",
        )[0] || null;
    }
    if (!bandElem) {
      // Try matching by localName, converting undefined to null
      const containerChildren = Array.from(bandContainer.children);
      bandElem =
        containerChildren.find(
          (child) => child.localName === "band" || child.tagName === "band",
        ) || null;
    }
    if (!bandElem) return;

    if (type === "detail") {
      const containerChildren = Array.from(bandContainer.children);
      const bandElems = containerChildren.filter(
        (child) => child.localName === "band" || child.tagName === "band",
      );
      if (bandElems.length > 1) {
        const allDetailElements: DesignElement[] = [];
        let firstHeight = 100;
        let splitTypeVal: string | undefined;

        bandElems.forEach((bElem, pIdx) => {
          const h = parseInt(bElem.getAttribute("height") || "100");
          if (pIdx === 0) {
            firstHeight = h;
            splitTypeVal = bElem.getAttribute("splitType") || undefined;
          }
          const pageElems = parseBandElements(bElem);
          pageElems.forEach((el) => {
            // Each <band> is a designer page; its breaks aren't elements
            if (el.type === "break") {
              return;
            }
            (el as any).pageIndex = pIdx;
            allDetailElements.push(el);
          });
        });

        properties.pageCount = bandElems.length;
        const detailBand: any = {
          type: "detail",
          height: firstHeight,
          elements: allDetailElements,
          splitType: splitTypeVal || "Stretch",
        };
        bands.push(detailBand);
        return;
      }
    }

    const height = parseInt(bandElem.getAttribute("height") || "0");
    const elements = parseBandElements(bandElem);

    // If detail has a single band with page breaks, split elements across pages
    if (
      type === "detail" &&
      elements.some(
        (el) => el.type === "break" && (el as any).breakType === "Page",
      )
    ) {
      const breaks = elements
        .filter((el) => el.type === "break" && (el as any).breakType === "Page")
        .sort((a, b) => a.y - b.y);

      elements.forEach((el) => {
        if (el.type === "break" && (el as any).breakType === "Page") return;
        const pageIdx = breaks.filter((brk) => el.y >= brk.y).length;
        (el as any).pageIndex = pageIdx;
      });
      properties.pageCount = breaks.length + 1;
    }

    // Breaks only mark page starts (used above); they aren't elements
    const band: any = {
      type: type as BandType,
      height,
      elements: elements.filter((el) => el.type !== "break"),
    };

    if (bandElem.hasAttribute("splitType")) {
      band.splitType = bandElem.getAttribute("splitType");
    } else if (bandElem.hasAttribute("isSplitAllowed")) {
      const isSplitAllowed = bandElem.getAttribute("isSplitAllowed") === "true";
      band.splitType = isSplitAllowed ? "Stretch" : "Prevent";
    }

    bands.push(band);
  });

  // Parse sub-datasets. A data table's own dataset is rebuilt from the
  // table's setup when the report is written, so it isn't kept here.
  const tableDatasetNames = new Set(
    collectBoundTables(bands).map((table) => table.binding.datasetName),
  );
  const datasets: SubDataset[] = [];
  Array.from(jasperReportElem.children).forEach((child) => {
    if (child.tagName === "subDataset" || child.localName === "subDataset") {
      const dataset = parseSubDataset(child);
      if (!tableDatasetNames.has(dataset.name)) datasets.push(dataset);
    }
  });

  // Parse report variables
  const variables: Variable[] = [];
  Array.from(jasperReportElem.children).forEach((child) => {
    if (child.tagName === "variable" || child.localName === "variable") {
      const name = child.getAttribute("name");
      const className = child.getAttribute("class") || "java.lang.String";
      if (name) {
        const variable: Variable = { name, class: className };
        // Extract the UUID (if present)
        const uuid = child.getAttribute("uuid");
        if (uuid) variable.uuid = uuid;
        const calcType = child.getAttribute("calculation");
        if (calcType) variable.calculationType = calcType;
        // Extract incrementType (if present; defaults to "None")
        if (child.hasAttribute("incrementType")) {
          variable.incrementType =
            child.getAttribute("incrementType") || "None";
        }
        // Extract incrementGroup (if present)
        if (child.hasAttribute("incrementGroup")) {
          variable.incrementGroup =
            child.getAttribute("incrementGroup") || undefined;
        }
        // Extract calculationGroup (if present)
        if (child.hasAttribute("calculationGroup")) {
          variable.calculationGroup =
            child.getAttribute("calculationGroup") || undefined;
        }
        const resetType = child.getAttribute("resetType");
        if (resetType) variable.resetType = resetType;
        const resetGroup = child.getAttribute("resetGroup");
        if (resetGroup) variable.resetGroup = resetGroup;
        // Extract isInitialized (if present; defaults to false)
        if (child.hasAttribute("isInitialized")) {
          variable.isInitialized =
            child.getAttribute("isInitialized") === "true";
        }
        const exprElem = child.querySelector("variableExpression");
        if (exprElem && exprElem.textContent)
          variable.expression = exprElem.textContent.trim();
        const initExprElem = child.querySelector("initialValueExpression");
        if (initExprElem && initExprElem.textContent)
          variable.initialValueExpression = initExprElem.textContent.trim();
        variables.push(variable);
      }
    }
  });

  // Parse report groups
  const groups: ReportGroup[] = [];
  Array.from(jasperReportElem.children).forEach((child) => {
    if (child.tagName === "group" || child.localName === "group") {
      const name = child.getAttribute("name");
      if (!name) return;

      const group: ReportGroup = {
        name,
        expression: "",
      };

      // Extract the UUID (if present)
      const uuid = child.getAttribute("uuid");
      if (uuid) group.uuid = uuid;

      // Parse the group expression
      const groupExpression = child.querySelector("groupExpression");
      if (groupExpression && groupExpression.textContent) {
        group.expression = groupExpression.textContent.trim();
      }

      // Parse group attributes
      if (child.hasAttribute("isStartNewPage")) {
        group.isStartNewPage = child.getAttribute("isStartNewPage") === "true";
      }
      // Extract isStartNewColumn (if present; defaults to false)
      if (child.hasAttribute("isStartNewColumn")) {
        group.isStartNewColumn =
          child.getAttribute("isStartNewColumn") === "true";
      }
      if (child.hasAttribute("isRepeatHeader")) {
        group.isRepeatHeader = child.getAttribute("isRepeatHeader") === "true";
      }
      // Extract isReprintHeaderOnEachPage (if present; defaults to false)
      if (child.hasAttribute("isReprintHeaderOnEachPage")) {
        group.isReprintHeaderOnEachPage =
          child.getAttribute("isReprintHeaderOnEachPage") === "true";
      }
      if (child.hasAttribute("isResetPageNumber")) {
        group.isResetPageNumber =
          child.getAttribute("isResetPageNumber") === "true";
      }
      // Extract isHideColumnHeader (if present; defaults to false)
      if (child.hasAttribute("isHideColumnHeader")) {
        group.isHideColumnHeader =
          child.getAttribute("isHideColumnHeader") === "true";
      }
      // Extract isKeepTogether (if present; defaults to false)
      if (child.hasAttribute("isKeepTogether")) {
        group.isKeepTogether = child.getAttribute("isKeepTogether") === "true";
      }
      // Extract isKeepFooterTogether (if present; defaults to false)
      if (child.hasAttribute("isKeepFooterTogether")) {
        group.isKeepFooterTogether =
          child.getAttribute("isKeepFooterTogether") === "true";
      }
      // Extract minHeightToStartNewPage (if present; defaults to 0)
      if (child.hasAttribute("minHeightToStartNewPage")) {
        group.minHeightToStartNewPage = parseInt(
          child.getAttribute("minHeightToStartNewPage") || "0",
        );
      }

      // Parse the group header (groupHeader)
      const groupHeaderElem = child.querySelector("groupHeader");
      if (groupHeaderElem) {
        const headerBandElem = groupHeaderElem.querySelector("band");
        if (headerBandElem) {
          const height = parseInt(headerBandElem.getAttribute("height") || "0");
          const elements = parseBandElements(headerBandElem);
          group.header = {
            type: "detail" as BandType,
            height,
            elements,
          };
        }
      }

      // Parse the group footer (groupFooter)
      const groupFooterElem = child.querySelector("groupFooter");
      if (groupFooterElem) {
        const footerBandElem = groupFooterElem.querySelector("band");
        if (footerBandElem) {
          const height = parseInt(footerBandElem.getAttribute("height") || "0");
          const elements = parseBandElements(footerBandElem);
          group.footer = {
            type: "detail" as BandType,
            height,
            elements,
          };
        }
      }

      groups.push(group);
    }
  });

  // Parse report-level <property> elements
  const reportProperties: Array<{ name: string; value: string }> = [];
  Array.from(jasperReportElem.children).forEach((child) => {
    if (child.tagName === "property" || child.localName === "property") {
      const propName = child.getAttribute("name");
      const propValue = child.getAttribute("value");
      if (propName && propValue) {
        reportProperties.push({ name: propName, value: propValue });
      }
    }
  });

  return {
    properties,
    bands,
    fields,
    parameters,
    datasets,
    variables,
    groups,
    // Report styles are not kept: tables rebuild theirs from their own look,
    // and saved table styles come from their report property
    tableStyles: parseSavedTableStyles(
      reportProperties.find((p) => p.name === SAVED_TABLE_STYLES_PROPERTY)?.value,
    ),
    reportProperties: reportProperties.filter((p) => p.name !== SAVED_TABLE_STYLES_PROPERTY),
  };
}

// Parse a sub-dataset element
function parseSubDataset(subDatasetElem: Element): SubDataset {
  const name = subDatasetElem.getAttribute("name") || "UnnamedDataset";

  // Parse dataset properties
  const properties: Record<string, string> = {};
  Array.from(subDatasetElem.children).forEach((child) => {
    if (child.tagName === "property" || child.localName === "property") {
      const propertyName = child.getAttribute("name");
      const propertyValue = child.getAttribute("value");
      if (propertyName && propertyValue) {
        properties[propertyName] = propertyValue;
      }
    }
  });

  // Parse the query string - only look at direct children
  let query: { language: string; text: string } | undefined;
  let queryStringElem = null;

  // 1. First look for a queryString among the direct children (without namespace)
  for (const child of Array.from(subDatasetElem.children)) {
    if (child.tagName === "queryString") {
      queryStringElem = child;
      break;
    }
  }

  // 2. If not found, try looking for a namespaced direct child
  if (!queryStringElem) {
    // Try using getElementsByTagNameNS to find a direct child
    const nsChildren = subDatasetElem.getElementsByTagNameNS(
      "http://jasperreports.sourceforge.net/jasperreports",
      "queryString",
    );
    if (nsChildren.length > 0) {
      // Ensure it's a direct child
      for (let i = 0; i < nsChildren.length; i++) {
        const child = nsChildren[i];
        if (child) {
          const parent = child.parentNode;
          if (parent === subDatasetElem) {
            queryStringElem = child;
            break;
          }
        }
      }
    }
  }

  // 3. If still not found, try matching a direct child by localName
  if (!queryStringElem) {
    queryStringElem =
      Array.from(subDatasetElem.children).find(
        (child) => child.localName === "queryString",
      ) || null;
  }
  if (queryStringElem) {
    const language = queryStringElem.getAttribute("language") || "sql";
    const text = queryStringElem.textContent?.trim() || "";
    query = { language, text };
  }

  // Parse the fields inside the dataset
  const fields: Field[] = [];
  Array.from(subDatasetElem.children).forEach((child) => {
    if (child.tagName === "field" || child.localName === "field") {
      const fieldName = child.getAttribute("name");
      const className = child.getAttribute("class") || "java.lang.String";
      if (fieldName) {
        // Parse field properties
        const fieldProperties: Record<string, string> = {};
        Array.from(child.children).forEach((fieldChild) => {
          if (
            fieldChild.tagName === "property" ||
            fieldChild.localName === "property"
          ) {
            const propName = fieldChild.getAttribute("name");
            const propValue = fieldChild.getAttribute("value");
            if (propName && propValue) {
              fieldProperties[propName] = propValue;
            }
          }
        });

        fields.push({
          name: fieldName,
          class: className,
          properties: fieldProperties,
        });
      }
    }
  });

  // Parse the parameters inside the dataset
  const parameters: Parameter[] = [];
  Array.from(subDatasetElem.children).forEach((child) => {
    if (child.tagName === "parameter" || child.localName === "parameter") {
      const paramName = child.getAttribute("name");
      const className = child.getAttribute("class") || "java.lang.String";
      if (paramName) {
        const param: Parameter = { name: paramName, class: className };
        const defaultValueExpr = child.querySelector("defaultValueExpression");
        if (defaultValueExpr && defaultValueExpr.textContent) {
          param.defaultValue = defaultValueExpr.textContent.trim();
        }
        parameters.push(param);
      }
    }
  });

  return { name, fields, parameters, properties, query };
}

function parseBandElements(bandElem: Element): any[] {
  const elements: any[] = [];
  // Static text is read as a Text element; a page break only marks where the
  // next designer page starts (see parseBands) and is never kept as an element
  const validElementTypes = [
    "staticText",
    "textField",
    "image",
    "line",
    "rectangle",
    "ellipse",
    "break",
    "frame",
    "chart",
  ];

  // Mapping of chart tag names to chart types
  const chartTagNames = [
    "pieChart",
    "pie3DChart",
    "barChart",
    "bar3DChart",
    "xyBarChart",
    "stackedBarChart",
    "stackedBar3DChart",
    "lineChart",
    "xyLineChart",
    "areaChart",
    "xyAreaChart",
    "stackedAreaChart",
    "scatterChart",
    "bubbleChart",
    "timeSeriesChart",
    "highLowChart",
    "candlestickChart",
    "meterChart",
    "thermometerChart",
    "multiAxisChart",
    "ganttChart",
    "spiderChart",
  ];

  // Iterate direct children rather than using querySelectorAll (avoids recursively finding nested elements)
  // This also preserves the elements' Z-order (stacking order)
  Array.from(bandElem.children).forEach((child) => {
    const elementType = child.localName || child.tagName;

    // Check whether this is a chart-type tag
    if (chartTagNames.includes(elementType)) {
      const parsedElement = parseElement(child, "chart");
      if (parsedElement) {
        elements.push(parsedElement);
      }
    } else if (elementType === "frame" && isEmptyTableFrame(child)) {
      const table = parseEmptyTable(child);
      if (table) elements.push(table);
    } else if (validElementTypes.includes(elementType)) {
      const parsedElement = parseElement(child, elementType);
      if (parsedElement) {
        elements.push(parsedElement);
      }
    } else if (elementType === "componentElement") {
      // Handle component elements, notably tables
      const parsedComponent = parseComponentElement(child);
      if (parsedComponent) {
        elements.push(parsedComponent);
      }
    }
  });

  return elements;
}

// Parse a component element, mainly used for tables
function parseComponentElement(componentElem: Element): any {
  const reportElement = componentElem.querySelector("reportElement");
  if (!reportElement) return null;

  // Find the table element - supports table elements with or without a namespace
  let tableElem = null;

  // 1. First look at direct children
  for (const child of Array.from(componentElem.children)) {
    if (
      child.tagName === "jr:table" ||
      child.localName === "table" ||
      child.tagName === "table"
    ) {
      tableElem = child;
      break;
    }
  }

  // 2. If not found, try using querySelector
  if (!tableElem) {
    tableElem = componentElem.querySelector("table");
  }

  // 3. If still not found, try searching all descendant elements
  if (!tableElem) {
    const allDescendants = componentElem.getElementsByTagName("*");
    for (const descendant of Array.from(allDescendants)) {
      if (
        descendant.tagName === "jr:table" ||
        descendant.localName === "table" ||
        descendant.tagName === "table"
      ) {
        tableElem = descendant;
        break;
      }
    }
  }

  if (tableElem) {
    return parseDataTable(tableElem, reportElement);
  }

  // Find a barcode4j element - supports with or without a namespace prefix
  const barcodeTypes = [
    "Code128",
    "Code39",
    "EAN13",
    "EAN8",
    "UPCA",
    "UPCE",
    "QRCode",
    "DataMatrix",
    "Interleaved2Of5",
    "Codabar",
    "EAN128",
    "PDF417",
    "POSTNET",
    "RoyalMailCustomer",
    "USPSIntelligentMail",
  ];

  for (const child of Array.from(componentElem.children)) {
    const childLocalName = child.localName || child.tagName;
    // Check whether this is a barcode4j element (with or without a namespace prefix)
    for (const barcodeType of barcodeTypes) {
      if (
        childLocalName === barcodeType ||
        child.tagName === `c:${barcodeType}`
      ) {
        // Parse the barcode element
        const codeExprElem = child.querySelector("codeExpression");
        const codeExpression = codeExprElem
          ? codeExprElem.textContent?.trim() || ""
          : "";

        const orientation = child.getAttribute("orientation");
        let rotation: "None" | "Left" | "Right" | "UpsideDown" = "None";
        if (orientation === "90") rotation = "Right";
        else if (orientation === "180") rotation = "UpsideDown";
        else if (orientation === "270") rotation = "Left";

        return {
          type: "barcode",
          uuid: reportElement.getAttribute("uuid") || crypto.randomUUID(),
          x: parseInt(reportElement.getAttribute("x") || "0"),
          y: parseInt(reportElement.getAttribute("y") || "0"),
          width: parseInt(reportElement.getAttribute("width") || "100"),
          height: parseInt(reportElement.getAttribute("height") || "30"),
          barcodeType: barcodeType,
          codeExpression: codeExpression,
          rotation: rotation,
          printWhenExpression: "",
        };
      }
    }
  }

  return null;
}

// Helper function: find a direct child element by name, accounting for namespaces
function directChildren(parent: Element, localName: string): Element[] {
  return Array.from(parent.children).filter((c) => (c.localName || c.tagName) === localName);
}

// Position and size every element shares
function readBounds(reportElement: Element) {
  return {
    uuid: reportElement.getAttribute("uuid") || crypto.randomUUID(),
    x: parseInt(reportElement.getAttribute("x") || "0"),
    y: parseInt(reportElement.getAttribute("y") || "0"),
    width: parseInt(reportElement.getAttribute("width") || "100"),
    height: parseInt(reportElement.getAttribute("height") || "40"),
  };
}

function readTableBinding(reportElement: Element) {
  const property = Array.from(reportElement.children).find(
    (c) => c.localName === "property" && c.getAttribute("name") === TABLE_BINDING_PROPERTY,
  );
  return property ? parseBinding(property.getAttribute("value")) : null;
}

// A data table: everything comes from its saved setup. Tables made elsewhere
// (no setup) become empty tables at the same place, ready for data.
function parseDataTable(tableElem: Element, reportElement: Element): TableElement {
  const binding = readTableBinding(reportElement);
  const firstColumn = Array.from(tableElem.children).find((c) => c.localName === "column");
  const cellHeight = (name: string) => {
    const cell = firstColumn
      ? Array.from(firstColumn.children).find((c) => c.localName === name)
      : undefined;
    const h = parseInt(cell?.getAttribute("height") || "");
    return Number.isNaN(h) ? undefined : h;
  };
  return {
    type: "table",
    ...readBounds(reportElement),
    ...(binding ? { binding } : {}),
    headerHeight: cellHeight("columnHeader") ?? TABLE_HEADER_HEIGHT,
    rowHeight: cellHeight("detailCell") ?? TABLE_ROW_HEIGHT,
  } as TableElement;
}

// An empty table is written as a marked, empty frame
function isEmptyTableFrame(frame: Element): boolean {
  const reportElement = findChildElement(frame, "reportElement");
  return !!reportElement && Array.from(reportElement.children).some(
    (c) => c.localName === "property" && c.getAttribute("name") === TABLE_BINDING_PROPERTY,
  );
}

function parseEmptyTable(frame: Element): TableElement | null {
  const reportElement = findChildElement(frame, "reportElement");
  if (!reportElement) return null;
  const bounds = readBounds(reportElement);
  return {
    type: "table",
    ...bounds,
    headerHeight: TABLE_HEADER_HEIGHT,
    rowHeight: TABLE_ROW_HEIGHT,
  } as TableElement;
}

function findChildElement(parent: Element, localName: string): Element | null {
  return (
    Array.from(parent.children).find(
      (child) => child.localName === localName || child.tagName === localName,
    ) || null
  );
}

function parseElement(element: Element, type: string): any {
  // Mapping of chart tag names to chart types
  const chartTagNames = [
    "pieChart",
    "pie3DChart",
    "barChart",
    "bar3DChart",
    "xyBarChart",
    "stackedBarChart",
    "stackedBar3DChart",
    "lineChart",
    "xyLineChart",
    "areaChart",
    "xyAreaChart",
    "stackedAreaChart",
    "scatterChart",
    "bubbleChart",
    "timeSeriesChart",
    "highLowChart",
    "candlestickChart",
    "meterChart",
    "thermometerChart",
    "multiAxisChart",
    "ganttChart",
    "spiderChart",
  ];

  // Find reportElement, accounting for namespaces
  // For chart types, reportElement lives inside the <chart> child element
  let reportElement = findChildElement(element, "reportElement");
  if (
    !reportElement &&
    (type === "chart" ||
      chartTagNames.includes(element.localName || element.tagName))
  ) {
    // Chart type: reportElement lives inside the <chart> child element
    const chartElem = findChildElement(element, "chart");
    if (chartElem) {
      reportElement = findChildElement(chartElem, "reportElement");
    }
  }
  if (!reportElement) return null;

  // "break" is read only so the band can split pages at it (it is not kept)
  const validElementTypes = [
    "staticText",
    "textField",
    "image",
    "line",
    "rectangle",
    "ellipse",
    "break",
    "frame",
    "table",
    "chart",
  ];
  const elementType = validElementTypes.includes(type as any)
    ? (type as any)
    : undefined;
  if (!elementType) return null;

  const result: Partial<DesignElement> = {
    uuid: reportElement.getAttribute("uuid") || crypto.randomUUID(), // Read the UUID; auto-generate one if it doesn't exist
    type: elementType,
    x: Math.max(0, parseInt(reportElement.getAttribute("x") || "0")),
    y: Math.max(0, parseInt(reportElement.getAttribute("y") || "0")),
    width: Math.max(
      1,
      Math.abs(parseInt(reportElement.getAttribute("width") || "100")),
    ),
    height: Math.max(
      1,
      Math.abs(parseInt(reportElement.getAttribute("height") || "30")),
    ),
  };

  if (reportElement.hasAttribute("forecolor")) {
    result.forecolor = reportElement.getAttribute("forecolor") || undefined;
  }

  if (reportElement.hasAttribute("backcolor")) {
    result.backcolor = reportElement.getAttribute("backcolor") || undefined;
  }

  const mode = reportElement.getAttribute("mode");
  if (mode) {
    result.mode = mode as "Opaque" | "Transparent";
  }

  // Find the box element, accounting for namespaces
  const boxElement = findChildElement(element, "box");
  if (boxElement) {
    result.box = parseBoxElement(boxElement);

    // Copy the border attributes to the element's root level, so the table UI can display them correctly
    const box = result.box;
    if (box) {
      const resultAny = result as any;
      if (box.pen) {
        resultAny.borderWidth = box.pen.lineWidth;
        resultAny.borderStyle = box.pen.lineStyle;
        resultAny.borderColor = box.pen.lineColor;
      }

      // Handle the per-side border attributes
      if (box.topPen) {
        resultAny.topBorderWidth = box.topPen.lineWidth;
        resultAny.topBorderStyle = box.topPen.lineStyle;
        resultAny.topBorderColor = box.topPen.lineColor;
      }
      if (box.leftPen) {
        resultAny.leftBorderWidth = box.leftPen.lineWidth;
        resultAny.leftBorderStyle = box.leftPen.lineStyle;
        resultAny.leftBorderColor = box.leftPen.lineColor;
      }
      if (box.bottomPen) {
        resultAny.bottomBorderWidth = box.bottomPen.lineWidth;
        resultAny.bottomBorderStyle = box.bottomPen.lineStyle;
        resultAny.bottomBorderColor = box.bottomPen.lineColor;
      }
      if (box.rightPen) {
        resultAny.rightBorderWidth = box.rightPen.lineWidth;
        resultAny.rightBorderStyle = box.rightPen.lineStyle;
        resultAny.rightBorderColor = box.rightPen.lineColor;
      }
    }
  }

  // Read the printWhenExpression (a reportElement child; older files may use an
  // attribute) and the style attribute
  const printWhenElem = findChildElement(reportElement, "printWhenExpression");
  if (printWhenElem) {
    (result as any).printWhenExpression =
      printWhenElem.textContent?.trim() || undefined;
  } else if (reportElement.hasAttribute("printWhenExpression")) {
    (result as any).printWhenExpression =
      reportElement.getAttribute("printWhenExpression") || undefined;
  }
  if (reportElement.hasAttribute("isPrintRepeatedValues")) {
    (result as any).isPrintRepeatedValues =
      reportElement.getAttribute("isPrintRepeatedValues") !== "false";
  }
  if (reportElement.hasAttribute("isRemoveLineWhenBlank")) {
    (result as any).isRemoveLineWhenBlank =
      reportElement.getAttribute("isRemoveLineWhenBlank") === "true";
  }
  if (reportElement.hasAttribute("isResetPageNumber")) {
    (result as any).isResetPageNumber =
      reportElement.getAttribute("isResetPageNumber") === "true";
  }
  if (reportElement.hasAttribute("isResetPageOverflow")) {
    (result as any).isResetPageOverflow =
      reportElement.getAttribute("isResetPageOverflow") === "true";
  }

  // Parse the newly added common attributes
  if (reportElement.hasAttribute("key")) {
    (result as any).key = reportElement.getAttribute("key") || undefined;
  }
  if (reportElement.hasAttribute("positionType")) {
    (result as any).positionType =
      reportElement.getAttribute("positionType") || undefined;
  }
  if (reportElement.hasAttribute("stretchType")) {
    (result as any).stretchType =
      reportElement.getAttribute("stretchType") || undefined;
  }

  // Parse styleExpression
  const styleExprElem = findChildElement(element, "styleExpression");
  if (styleExprElem) {
    (result as any).styleExpression = styleExprElem.textContent?.trim() || "";
  }

  // Parse property elements
  const propertyElems = reportElement.querySelectorAll("property");
  if (propertyElems.length > 0) {
    const properties: Array<{ name: string; value: string }> = [];
    propertyElems.forEach((prop) => {
      const name = prop.getAttribute("name");
      const value = prop.getAttribute("value");
      if (name) {
        properties.push({ name, value: value || "" });
      }
    });
    if (properties.length > 0) {
      (result as any).properties = properties;
    }
  }

  // Parse propertyExpression elements
  const propExprElems = reportElement.querySelectorAll("propertyExpression");
  if (propExprElems.length > 0) {
    const propertyExpressions: Array<{
      name: string;
      valueExpression: string;
    }> = [];
    propExprElems.forEach((prop) => {
      const name = prop.getAttribute("name");
      const valueExpression = prop.textContent?.trim() || "";
      if (name) {
        propertyExpressions.push({ name, valueExpression });
      }
    });
    if (propertyExpressions.length > 0) {
      (result as any).propertyExpressions = propertyExpressions;
    }
  }

  switch (type) {
    case "staticText":
      parseStaticTextElement(element, result);
      staticTextToTextField(result);
      break;
    case "textField":
      parseTextFieldElement(element, result);
      // A page number written by another tool becomes a page number here too
      detectPagination(result as any);
      break;
    case "image":
      parseImageElement(element, result);
      break;
    case "line":
      parseLineElement(element, result);
      break;
    case "rectangle":
      parseRectangleElement(element, result);
      break;
    case "ellipse":
      parseEllipseElement(element, result);
      break;
    case "break":
      (result as any).breakType = element.getAttribute("type") || "Page";
      break;
    case "frame":
      parseFrameElement(element, result);
      break;
    case "chart":
      parseChartElement(element, result);
      break;
  }

  if (elementType === "rectangle" && element.hasAttribute("radius")) {
    (result as any).radius = parseInt(element.getAttribute("radius") || "0");
  }

  if (elementType === "frame") {
    restoreRoundedFrameBorder(result);
    restoreBoxCornerRadii(result);
  }

  return result;
}

// Different corner radii are stored as a frame property; move them back to the model
function restoreBoxCornerRadii(frame: any): void {
  const property = frame.properties?.find((p: any) => p.name === BOX_CORNER_RADIUS_PROPERTY);
  if (!property) return;
  frame.properties = frame.properties.filter((p: any) => p !== property);
  if (frame.properties.length === 0) delete frame.properties;
  const radii = decodeCornerRadii(property.value || "");
  if (radii) frame.cornerRadii = radii;
}

// A frame with rounded corners is written as a frame whose first children are
// marked rounded rectangles; turn them back into a frame with a radius
function restoreRoundedFrameBorder(frame: any): void {
  const markerOf = (el: any): string | undefined =>
    el?.type === "rectangle"
      ? el.properties?.find((p: any) => p.name === ROUNDED_BORDER_PROPERTY)?.value
      : undefined;
  const first = frame.elements?.[0];
  const marker = markerOf(first);
  if (!marker) return;

  const box = withoutLines(frame.box);
  let fill: any = null;

  if (marker === ROUNDED_MARKER.layeredBack) {
    // Back shape (border colour) + front shape (inside)
    const front = frame.elements[1];
    const frontMarker = markerOf(front);
    const pens =
      first.properties.find((p: any) => p.name === ROUNDED_BORDER_PENS_PROPERTY)?.value ?? "";
    Object.assign(box, decodeSidePens(pens));
    frame.elements.splice(0, frontMarker ? 2 : 1);
    if (frontMarker === ROUNDED_MARKER.layeredFrontFill) fill = front;
  } else {
    // One rounded rectangle carrying the pen and fill
    frame.elements.shift();
    if ((first.pen?.lineWidth ?? 0) > 0) {
      box.pen = {
        lineWidth: first.pen.lineWidth,
        lineStyle: first.pen.lineStyle || "Solid",
        lineColor: first.pen.lineColor || "#000000",
      };
    }
    fill = first;
  }

  if (frame.elements.length === 0) delete frame.elements;
  frame.radius = first.radius;
  frame.box = orUndefined(box);
  if (fill?.mode === "Opaque" && fill.backcolor) {
    frame.mode = "Opaque";
    frame.backcolor = fill.backcolor;
  }
}

function parseBoxElement(boxElement: Element): any {
  const box = {} as any;

  if (boxElement.hasAttribute("padding")) {
    box.padding = parseInt(boxElement.getAttribute("padding") || "0");
  }

  if (boxElement.hasAttribute("topPadding")) {
    box.topPadding = parseInt(boxElement.getAttribute("topPadding") || "0");
  }
  if (boxElement.hasAttribute("leftPadding")) {
    box.leftPadding = parseInt(boxElement.getAttribute("leftPadding") || "0");
  }
  if (boxElement.hasAttribute("bottomPadding")) {
    box.bottomPadding = parseInt(
      boxElement.getAttribute("bottomPadding") || "0",
    );
  }
  if (boxElement.hasAttribute("rightPadding")) {
    box.rightPadding = parseInt(boxElement.getAttribute("rightPadding") || "0");
  }

  if (boxElement.hasAttribute("border")) {
    if (!box.pen) box.pen = {};
    box.pen.lineWidth = parseInt(boxElement.getAttribute("border") || "0");
  }

  if (boxElement.hasAttribute("borderColor")) {
    if (!box.pen) box.pen = {};
    box.pen.lineColor = boxElement.getAttribute("borderColor");
  }

  if (boxElement.hasAttribute("topBorder")) {
    if (!box.topPen) box.topPen = {};
    box.topPen.lineWidth = parseInt(
      boxElement.getAttribute("topBorder") || "0",
    );
  }

  if (boxElement.hasAttribute("topBorderColor")) {
    if (!box.topPen) box.topPen = {};
    box.topPen.lineColor = boxElement.getAttribute("topBorderColor");
  }

  if (boxElement.hasAttribute("leftBorder")) {
    if (!box.leftPen) box.leftPen = {};
    box.leftPen.lineWidth = parseInt(
      boxElement.getAttribute("leftBorder") || "0",
    );
  }

  if (boxElement.hasAttribute("leftBorderColor")) {
    if (!box.leftPen) box.leftPen = {};
    box.leftPen.lineColor = boxElement.getAttribute("leftBorderColor");
  }

  if (boxElement.hasAttribute("bottomBorder")) {
    if (!box.bottomPen) box.bottomPen = {};
    box.bottomPen.lineWidth = parseInt(
      boxElement.getAttribute("bottomBorder") || "0",
    );
  }

  if (boxElement.hasAttribute("bottomBorderColor")) {
    if (!box.bottomPen) box.bottomPen = {};
    box.bottomPen.lineColor = boxElement.getAttribute("bottomBorderColor");
  }

  if (boxElement.hasAttribute("rightBorder")) {
    if (!box.rightPen) box.rightPen = {};
    box.rightPen.lineWidth = parseInt(
      boxElement.getAttribute("rightBorder") || "0",
    );
  }

  if (boxElement.hasAttribute("rightBorderColor")) {
    if (!box.rightPen) box.rightPen = {};
    box.rightPen.lineColor = boxElement.getAttribute("rightBorderColor");
  }

  const topPen = findChildElement(boxElement, "topPen");
  if (topPen) box.topPen = parsePenElement(topPen);

  const leftPen = findChildElement(boxElement, "leftPen");
  if (leftPen) box.leftPen = parsePenElement(leftPen);

  const bottomPen = findChildElement(boxElement, "bottomPen");
  if (bottomPen) box.bottomPen = parsePenElement(bottomPen);

  const rightPen = findChildElement(boxElement, "rightPen");
  if (rightPen) box.rightPen = parsePenElement(rightPen);

  const pen = findChildElement(boxElement, "pen");
  if (pen) box.pen = parsePenElement(pen);

  return box;
}

function parsePenElement(penElement: Element): any {
  const pen = {} as any;
  if (penElement.hasAttribute("lineWidth")) {
    pen.lineWidth = parseFloat(penElement.getAttribute("lineWidth") || "0");
  }
  if (penElement.hasAttribute("lineStyle"))
    pen.lineStyle = penElement.getAttribute("lineStyle");
  if (penElement.hasAttribute("lineColor"))
    pen.lineColor = penElement.getAttribute("lineColor");
  return pen;
}

function parseStaticTextElement(element: Element, result: any): void {
  const textElement = findChildElement(element, "textElement");
  if (textElement) {
    if (textElement.hasAttribute("textAlignment")) {
      result.textAlignment = textElement.getAttribute("textAlignment");
    }

    if (textElement.hasAttribute("verticalAlignment")) {
      result.verticalAlignment = textElement.getAttribute("verticalAlignment");
    }

    if (textElement.hasAttribute("isStyledText")) {
      const isStyledText = textElement.getAttribute("isStyledText") === "true";
      result.markup = isStyledText ? "styled" : "none";
    }

    if (textElement.hasAttribute("markup")) {
      result.markup = textElement.getAttribute("markup");
    }

    const fontElement = findChildElement(textElement, "font");
    if (fontElement) {
      if (fontElement.hasAttribute("size"))
        result.fontSize = parseInt(fontElement.getAttribute("size") || "12");
      result.isBold = fontElement.getAttribute("isBold") === "true";
      result.isItalic = fontElement.getAttribute("isItalic") === "true";
      result.isUnderline = fontElement.getAttribute("isUnderline") === "true";
      if (fontElement.hasAttribute("fontName"))
        result.fontFamily = fontElement.getAttribute("fontName");
    }
  }

  const textNode = findChildElement(element, "text");
  if (textNode) {
    result.text = textNode.textContent || "";
  }

  // Parse StaticText-specific attributes
  if (element.hasAttribute("textAdjust")) {
    result.textAdjust = element.getAttribute("textAdjust");
  }
  if (element.hasAttribute("rotation")) {
    result.rotation = element.getAttribute("rotation");
  }
  if (element.hasAttribute("pattern")) {
    result.pattern = element.getAttribute("pattern");
  }
}

// Static text is shown and edited as a Text element: its text becomes a
// string literal expression, so it prints the same
function staticTextToTextField(result: any): void {
  const text = String(result.text ?? "");
  delete result.text;
  result.type = "textField";
  result.expression = `"${text
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, "\\n")}"`;
  result.evaluationTime = "Now";
  result.isBlankWhenNull = false;
  if (!result.markup) result.markup = "none";
}

function parseTextFieldElement(element: Element, result: any): void {
  if (element.hasAttribute("isStretchWithOverflow")) {
    const isStretchWithOverflow =
      element.getAttribute("isStretchWithOverflow") === "true";
    result.textAdjust = isStretchWithOverflow ? "StretchHeight" : "CutText";
  }

  if (element.hasAttribute("textAdjust")) {
    result.textAdjust = element.getAttribute("textAdjust");
  }

  if (element.hasAttribute("evaluationTime")) {
    result.evaluationTime = element.getAttribute("evaluationTime");
    if (element.hasAttribute("evaluationGroup")) {
      result.evaluationGroup = element.getAttribute("evaluationGroup");
    }
  }

  if (element.hasAttribute("pattern"))
    result.pattern = element.getAttribute("pattern");
  result.isBlankWhenNull = element.hasAttribute("isBlankWhenNull")
    ? element.getAttribute("isBlankWhenNull") === "true"
    : true;

  // Parse hyperlink attributes
  if (element.hasAttribute("hyperlinkType"))
    result.hyperlinkType = element.getAttribute("hyperlinkType");
  if (element.hasAttribute("bookmarkLevel"))
    result.bookmarkLevel = parseInt(
      element.getAttribute("bookmarkLevel") || "0",
    );

  const textElement = findChildElement(element, "textElement");
  if (textElement) {
    if (textElement.hasAttribute("textAlignment")) {
      result.textAlignment = textElement.getAttribute("textAlignment");
    }

    if (textElement.hasAttribute("verticalAlignment")) {
      result.verticalAlignment = textElement.getAttribute("verticalAlignment");
    }

    if (textElement.hasAttribute("isStyledText")) {
      const isStyledText = textElement.getAttribute("isStyledText") === "true";
      result.markup = isStyledText ? "styled" : "none";
    }

    if (textElement.hasAttribute("markup")) {
      result.markup = textElement.getAttribute("markup");
    }

    if (textElement.hasAttribute("rotation")) {
      result.rotation = textElement.getAttribute("rotation");
    }

    const fontElement = findChildElement(textElement, "font");
    if (fontElement) {
      if (fontElement.hasAttribute("size"))
        result.fontSize = parseInt(fontElement.getAttribute("size") || "12");
      result.isBold = fontElement.getAttribute("isBold") === "true";
      result.isItalic = fontElement.getAttribute("isItalic") === "true";
      result.isUnderline = fontElement.getAttribute("isUnderline") === "true";
      if (fontElement.hasAttribute("fontName"))
        result.fontFamily = fontElement.getAttribute("fontName");
    }
  }

  const expressionElem = findChildElement(element, "textFieldExpression");
  if (expressionElem) {
    result.expression = expressionElem.textContent || "";
    const fieldMatch = result.expression.match(/\$F\{([^}]+)\}/);
    if (fieldMatch) {
      result.fieldName = fieldMatch[1];
    }
  }

  // Parse hyperlink expressions
  const hyperlinkRefExpr = findChildElement(
    element,
    "hyperlinkReferenceExpression",
  );
  if (hyperlinkRefExpr) {
    result.hyperlinkReferenceExpression = hyperlinkRefExpr.textContent || "";
  }
  const hyperlinkAnchorExpr = findChildElement(
    element,
    "hyperlinkAnchorExpression",
  );
  if (hyperlinkAnchorExpr) {
    result.hyperlinkAnchorExpression = hyperlinkAnchorExpr.textContent || "";
  }
  const hyperlinkPageExpr = findChildElement(
    element,
    "hyperlinkPageExpression",
  );
  if (hyperlinkPageExpr) {
    result.hyperlinkPageExpression = hyperlinkPageExpr.textContent || "";
  }

  // Parse the newly added hyperlink expressions
  const hyperlinkTooltipExpr = findChildElement(
    element,
    "hyperlinkTooltipExpression",
  );
  if (hyperlinkTooltipExpr) {
    result.hyperlinkTooltipExpression = hyperlinkTooltipExpr.textContent || "";
  }
  const hyperlinkWhenExpr = findChildElement(
    element,
    "hyperlinkWhenExpression",
  );
  if (hyperlinkWhenExpr) {
    result.hyperlinkWhenExpression = hyperlinkWhenExpr.textContent || "";
  }
  const anchorNameExpr = findChildElement(element, "anchorNameExpression");
  if (anchorNameExpr) {
    result.anchorNameExpression = anchorNameExpr.textContent || "";
  }
  const bookmarkLevelExpr = findChildElement(
    element,
    "bookmarkLevelExpression",
  );
  if (bookmarkLevelExpr) {
    result.bookmarkLevelExpression = bookmarkLevelExpr.textContent || "";
  }
  const patternExpr = findChildElement(element, "patternExpression");
  if (patternExpr) {
    result.patternExpression = patternExpr.textContent || "";
  }
}

function parseImageElement(element: Element, result: any): void {
  if (element.hasAttribute("scaleImage"))
    result.scaleImage = element.getAttribute("scaleImage");
  if (element.hasAttribute("hAlign"))
    result.hAlign = element.getAttribute("hAlign");
  if (element.hasAttribute("vAlign"))
    result.vAlign = element.getAttribute("vAlign");
  if (element.hasAttribute("isUsingCache"))
    result.isUsingCache = element.getAttribute("isUsingCache") === "true";
  if (element.hasAttribute("isLazy"))
    result.isLazy = element.getAttribute("isLazy") === "true";
  if (element.hasAttribute("onErrorType"))
    result.onErrorType = element.getAttribute("onErrorType");
  if (element.hasAttribute("evaluationTime"))
    result.evaluationTime = element.getAttribute("evaluationTime");
  if (element.hasAttribute("hyperlinkType"))
    result.hyperlinkType = element.getAttribute("hyperlinkType");
  if (element.hasAttribute("rotation"))
    result.rotation = element.getAttribute("rotation");
  if (element.hasAttribute("bookmarkLevel"))
    result.bookmarkLevel = parseInt(
      element.getAttribute("bookmarkLevel") || "0",
    );

  const graphicElement = parseGraphicElement(element);
  if (Object.keys(graphicElement).length > 0) {
    Object.assign(result, graphicElement);
  }

  const imageExpression = element.querySelector("imageExpression");
  if (imageExpression) {
    result.imageExpression = imageExpression.textContent || "";
  }

  // Parse hyperlink expressions
  const hyperlinkRefExpr = findChildElement(
    element,
    "hyperlinkReferenceExpression",
  );
  if (hyperlinkRefExpr) {
    result.hyperlinkReferenceExpression = hyperlinkRefExpr.textContent || "";
  }
  const hyperlinkAnchorExpr = findChildElement(
    element,
    "hyperlinkAnchorExpression",
  );
  if (hyperlinkAnchorExpr) {
    result.hyperlinkAnchorExpression = hyperlinkAnchorExpr.textContent || "";
  }
  const hyperlinkPageExpr = findChildElement(
    element,
    "hyperlinkPageExpression",
  );
  if (hyperlinkPageExpr) {
    result.hyperlinkPageExpression = hyperlinkPageExpr.textContent || "";
  }
  const hyperlinkTooltipExpr = findChildElement(
    element,
    "hyperlinkTooltipExpression",
  );
  if (hyperlinkTooltipExpr) {
    result.hyperlinkTooltipExpression = hyperlinkTooltipExpr.textContent || "";
  }
  const hyperlinkWhenExpr = findChildElement(
    element,
    "hyperlinkWhenExpression",
  );
  if (hyperlinkWhenExpr) {
    result.hyperlinkWhenExpression = hyperlinkWhenExpr.textContent || "";
  }
  const anchorNameExpr = findChildElement(element, "anchorNameExpression");
  if (anchorNameExpr) {
    result.anchorNameExpression = anchorNameExpr.textContent || "";
  }
  const bookmarkLevelExpr = findChildElement(
    element,
    "bookmarkLevelExpression",
  );
  if (bookmarkLevelExpr) {
    result.bookmarkLevelExpression = bookmarkLevelExpr.textContent || "";
  }
}

function parseLineElement(element: Element, result: any): void {
  if (element.hasAttribute("direction")) {
    result.lineDirection = element.getAttribute("direction");
  }
  if (element.hasAttribute("evaluationTime")) {
    result.evaluationTime = element.getAttribute("evaluationTime");
  }
  // Parse the direct pen attributes on the line tag
  if (element.hasAttribute("lineWidth")) {
    result.lineWidth = parseFloat(element.getAttribute("lineWidth") || "0");
  }
  if (element.hasAttribute("lineColor")) {
    result.lineColor = element.getAttribute("lineColor");
  }
  if (element.hasAttribute("lineStyle")) {
    result.lineStyle = element.getAttribute("lineStyle");
  }

  const graphicElement = parseGraphicElement(element);
  if (Object.keys(graphicElement).length > 0) {
    Object.assign(result, graphicElement);
  }
}

function parseGraphicElement(element: Element): any {
  const graphicElement: any = {};

  const graphicEl = element.querySelector("graphicElement");
  if (graphicEl) {
    if (graphicEl.hasAttribute("stretchType")) {
      graphicElement.stretchType = graphicEl.getAttribute("stretchType");
    }

    if (graphicEl.hasAttribute("fill")) {
      graphicElement.fill = graphicEl.getAttribute("fill");
    }

    const penElement = graphicEl.querySelector("pen");
    if (penElement) {
      const pen: any = {};
      if (penElement.hasAttribute("lineWidth")) {
        pen.lineWidth = parseFloat(penElement.getAttribute("lineWidth") || "0");
      }
      if (penElement.hasAttribute("lineStyle")) {
        pen.lineStyle = penElement.getAttribute("lineStyle");
      }
      if (penElement.hasAttribute("lineColor")) {
        pen.lineColor = penElement.getAttribute("lineColor");
      }
      graphicElement.pen = pen;
    }
  }

  return graphicElement;
}

function parseRectangleElement(element: Element, result: any): void {
  const graphicElement = parseGraphicElement(element);
  if (Object.keys(graphicElement).length > 0) {
    Object.assign(result, graphicElement);
  }
}

function parseEllipseElement(element: Element, result: any): void {
  const graphicElement = parseGraphicElement(element);
  if (Object.keys(graphicElement).length > 0) {
    Object.assign(result, graphicElement);
  }
}

function parseFrameElement(element: Element, result: any): void {
  // Parse the attributes on the frame tag
  if (element.hasAttribute("isIgnorePagination")) {
    result.isIgnorePagination =
      element.getAttribute("isIgnorePagination") === "true";
  }
  if (element.hasAttribute("splitType")) {
    result.splitType = element.getAttribute("splitType");
  } else if (element.hasAttribute("isSplitAllowed")) {
    const isSplitAllowed = element.getAttribute("isSplitAllowed") === "true";
    result.splitType = isSplitAllowed ? "Stretch" : "Prevent";
  }
  if (element.hasAttribute("evaluationTime")) {
    result.evaluationTime = element.getAttribute("evaluationTime");
  }
  if (element.hasAttribute("printWhenGroupChanges")) {
    result.printWhenGroupChanges = element.getAttribute(
      "printWhenGroupChanges",
    );
  }

  // Recursively parse the child elements within the container
  const elements: any[] = [];
  const validElementTypes = [
    "staticText",
    "textField",
    "image",
    "line",
    "rectangle",
    "ellipse",
    "frame",
    "chart",
  ];

  // Iterate direct child elements
  Array.from(element.children).forEach((child) => {
    const childType = child.localName || child.tagName;
    if (validElementTypes.includes(childType)) {
      const parsedElement = parseElement(child, childType);
      if (parsedElement) {
        elements.push(parsedElement);
      }
    }
  });

  if (elements.length > 0) {
    result.elements = elements;
  }

  // Parse layout information from the property elements
  const properties = element.querySelectorAll("property");
  properties.forEach((prop) => {
    const name = prop.getAttribute("name");
    const value = prop.getAttribute("value");
    if (name === "com.jaspersoft.studio.layout" && value) {
      if (value.includes("HorizontalLayout")) {
        result.layout = "HorizontalLayout";
      } else if (value.includes("VerticalLayout")) {
        result.layout = "VerticalLayout";
      } else if (value.includes("FreeLayout")) {
        result.layout = "FreeLayout";
      }
    }
  });
}

// Parse a chart element
function parseChartElement(element: Element, result: any): void {
  // Determine the chart type from the element's tag name
  const tagName = element.tagName || element.localName || "";
  const chartTypeMap: Record<string, string> = {
    pieChart: "pie",
    pie3DChart: "pie3D",
    barChart: "bar",
    bar3DChart: "bar3D",
    xyBarChart: "xyBar",
    stackedBarChart: "stackedBar",
    stackedBar3DChart: "stackedBar3D",
    lineChart: "line",
    xyLineChart: "xyLine",
    areaChart: "area",
    xyAreaChart: "xyArea",
    stackedAreaChart: "stackedArea",
    scatterChart: "scatter",
    bubbleChart: "bubble",
    timeSeriesChart: "timeSeries",
    highLowChart: "highLow",
    candlestickChart: "candlestick",
    meterChart: "meter",
    thermometerChart: "thermometer",
    multiAxisChart: "multiAxis",
    ganttChart: "gantt",
    spiderChart: "spider",
  };

  // Try matching tag names with or without a namespace
  for (const [key, value] of Object.entries(chartTypeMap)) {
    if (tagName === key || tagName === `jr:${key}` || tagName.includes(key)) {
      result.chartType = value;
      break;
    }
  }

  // Parse the chart child element
  const chartElem =
    element.querySelector("chart") ||
    (element.localName === "chart" ? element : null);

  if (chartElem) {
    // chart element attributes
    if (chartElem.hasAttribute("evaluationTime")) {
      result.evaluationTime = chartElem.getAttribute("evaluationTime");
    }
    if (chartElem.hasAttribute("evaluationGroup")) {
      result.evaluationGroup = chartElem.getAttribute("evaluationGroup");
    }
    if (chartElem.hasAttribute("renderType")) {
      result.renderType = chartElem.getAttribute("renderType");
    }
    if (chartElem.hasAttribute("customizerClass")) {
      result.customizerClass = chartElem.getAttribute("customizerClass");
    }

    // chartTitle
    const chartTitleElem = chartElem.querySelector("chartTitle");
    if (chartTitleElem) {
      const titleExprElem = chartTitleElem.querySelector("titleExpression");
      if (titleExprElem) {
        result.titleExpression = titleExprElem.textContent?.trim() || "";
      }
    }
    // Backward compatibility with the old format: titleExpression directly under chart
    if (!result.titleExpression) {
      const titleExprElem = chartElem.querySelector("titleExpression");
      if (titleExprElem) {
        result.titleExpression = titleExprElem.textContent?.trim() || "";
      }
    }

    // chartSubtitle
    const chartSubtitleElem = chartElem.querySelector("chartSubtitle");
    if (chartSubtitleElem) {
      const subtitleExprElem =
        chartSubtitleElem.querySelector("subtitleExpression");
      if (subtitleExprElem) {
        result.subtitleExpression = subtitleExprElem.textContent?.trim() || "";
      }
    }
    if (!result.subtitleExpression) {
      const subtitleExprElem = chartElem.querySelector("subtitleExpression");
      if (subtitleExprElem) {
        result.subtitleExpression = subtitleExprElem.textContent?.trim() || "";
      }
    }

    // chartLegend
    const chartLegendElem = chartElem.querySelector("chartLegend");
    if (chartLegendElem) {
      result.isShowLegend = true;
      const labelExprElem = chartLegendElem.querySelector("labelExpression");
      if (labelExprElem) {
        result.legendExpression = labelExprElem.textContent?.trim() || "";
      }
    }
    // Backward compatibility with the old format
    if (!result.legendExpression) {
      const legendExprElem = chartElem.querySelector("legendExpression");
      if (legendExprElem) {
        result.legendExpression = legendExprElem.textContent?.trim() || "";
      }
    }

    // hyperlinkTooltipExpression
    const tooltipElem = chartElem.querySelector("hyperlinkTooltipExpression");
    if (tooltipElem) {
      result.hyperlinkTooltipExpression = tooltipElem.textContent?.trim() || "";
    }

    // hyperlinkReferenceExpression
    const hyperlinkElem = chartElem.querySelector(
      "hyperlinkReferenceExpression",
    );
    if (hyperlinkElem) {
      result.hyperlinkExpression = hyperlinkElem.textContent?.trim() || "";
      if (hyperlinkElem.hasAttribute("type")) {
        result.hyperlinkType = hyperlinkElem.getAttribute("type");
      }
      if (hyperlinkElem.hasAttribute("target")) {
        result.hyperlinkTarget = hyperlinkElem.getAttribute("target");
      }
      if (hyperlinkElem.hasAttribute("bookmarkLevel")) {
        result.bookmarkLevel = parseInt(
          hyperlinkElem.getAttribute("bookmarkLevel") || "0",
        );
      }
    }
  }

  // Parse reportElement attributes
  const reportElem = element.querySelector("reportElement");
  if (reportElem) {
    if (reportElem.hasAttribute("uuid")) {
      result.uuid = reportElem.getAttribute("uuid");
    }
  }

  // Parse the outer chart element's attributes (supports evaluationTime living on the outermost element)
  if (!result.evaluationTime && element.hasAttribute("evaluationTime")) {
    result.evaluationTime = element.getAttribute("evaluationTime");
  }

  // Parse the dataset
  parseChartDataset(element, result);

  // Parse the Plot
  parseChartPlot(element, result);
}

// Parse the chart dataset
function parseChartDataset(element: Element, result: any): void {
  const chartType = result.chartType || "bar";

  // Pie chart dataset
  const pieDataset = element.querySelector("pieDataset");
  if (pieDataset) {
    parseDatasetAttributes(pieDataset, result);

    const keyExpr = pieDataset.querySelector("keyExpression");
    if (keyExpr) {
      result.keyExpression = keyExpr.textContent?.trim() || "";
    }
    const valueExpr = pieDataset.querySelector("valueExpression");
    if (valueExpr) {
      result.valueExpression = valueExpr.textContent?.trim() || "";
    }
    return;
  }

  // Category dataset
  const categoryDataset = element.querySelector("categoryDataset");
  if (categoryDataset) {
    parseDatasetAttributes(categoryDataset, result);

    const categorySeries = categoryDataset.querySelector("categorySeries");
    if (categorySeries) {
      const seriesExpr = categorySeries.querySelector("seriesExpression");
      if (seriesExpr) {
        result.seriesExpression = seriesExpr.textContent?.trim() || "";
      }
      const categoryExpr = categorySeries.querySelector("categoryExpression");
      if (categoryExpr) {
        result.categoryExpression = categoryExpr.textContent?.trim() || "";
      }
      const valueExpr = categorySeries.querySelector("valueExpression");
      if (valueExpr) {
        result.valueExpression = valueExpr.textContent?.trim() || "";
      }
    }
    return;
  }

  // XY dataset
  const xyDataset = element.querySelector("xyDataset");
  if (xyDataset) {
    parseDatasetAttributes(xyDataset, result);

    const xySeries = xyDataset.querySelector("xySeries");
    if (xySeries) {
      const seriesExpr = xySeries.querySelector("seriesExpression");
      if (seriesExpr) {
        result.seriesExpression = seriesExpr.textContent?.trim() || "";
      }
      const xValueExpr = xySeries.querySelector("xValueExpression");
      if (xValueExpr) {
        result.xValueExpression = xValueExpr.textContent?.trim() || "";
      }
      const yValueExpr = xySeries.querySelector("yValueExpression");
      if (yValueExpr) {
        result.yValueExpression = yValueExpr.textContent?.trim() || "";
      }
    }
    return;
  }

  // HighLow dataset
  const highLowDataset = element.querySelector("highLowDataset");
  if (highLowDataset) {
    parseDatasetAttributes(highLowDataset, result);

    const highLowSeries = highLowDataset.querySelector("highLowSeries");
    if (highLowSeries) {
      const seriesExpr = highLowSeries.querySelector("seriesExpression");
      if (seriesExpr) {
        result.seriesExpression = seriesExpr.textContent?.trim() || "";
      }
      const xValueExpr = highLowSeries.querySelector("xValueExpression");
      if (xValueExpr) {
        result.xValueExpression = xValueExpr.textContent?.trim() || "";
      }
      const yValueExpr = highLowSeries.querySelector("yValueExpression");
      if (yValueExpr) {
        result.yValueExpression = yValueExpr.textContent?.trim() || "";
      }
    }
    return;
  }
}

// Parse the dataset's common attributes
function parseDatasetAttributes(datasetElem: Element, result: any): void {
  const dataset = datasetElem.querySelector("dataset");
  if (dataset) {
    if (dataset.hasAttribute("incrementType")) {
      result.incrementType = dataset.getAttribute("incrementType");
    }
    if (dataset.hasAttribute("incrementGroup")) {
      result.incrementGroup = dataset.getAttribute("incrementGroup");
    }

    const datasetRun = dataset.querySelector("datasetRun");
    if (datasetRun) {
      if (datasetRun.hasAttribute("subDataset")) {
        result.subDataset = datasetRun.getAttribute("subDataset");
      }
      const dsExpr = datasetRun.querySelector("dataSourceExpression");
      if (dsExpr) {
        result.dataSourceExpression = dsExpr.textContent?.trim() || "";
      }
    }
  }
}

// Parse the chart Plot
function parseChartPlot(element: Element, result: any): void {
  const plotTags = [
    "piePlot",
    "pie3DPlot",
    "barPlot",
    "bar3DPlot",
    "linePlot",
    "areaPlot",
    "scatterPlot",
    "bubblePlot",
    "highLowPlot",
    "meterPlot",
    "thermometerPlot",
  ];

  for (const tag of plotTags) {
    const plotElem = element.querySelector(tag);
    if (plotElem) {
      // Pie chart attributes
      if (plotElem.hasAttribute("isCircular")) {
        result.isCircular = plotElem.getAttribute("isCircular") === "true";
      }

      // Line chart attributes
      if (plotElem.hasAttribute("isShowShapes")) {
        result.isShowShapes = plotElem.getAttribute("isShowShapes") === "true";
      }

      // itemLabel
      const itemLabel = plotElem.querySelector("itemLabel");
      if (itemLabel) {
        if (itemLabel.hasAttribute("color")) {
          result.itemLabelColor = itemLabel.getAttribute("color");
        }
        if (itemLabel.hasAttribute("backgroundColor")) {
          result.itemLabelBackgroundColor =
            itemLabel.getAttribute("backgroundColor");
        }
      }

      // Axis labels
      const categoryAxisLabel = plotElem.querySelector(
        "categoryAxisLabelExpression",
      );
      if (categoryAxisLabel) {
        result.categoryAxisLabelExpression =
          categoryAxisLabel.textContent?.trim() || "";
      }

      const valueAxisLabel = plotElem.querySelector("valueAxisLabelExpression");
      if (valueAxisLabel) {
        result.valueAxisLabelExpression =
          valueAxisLabel.textContent?.trim() || "";
      }

      break;
    }
  }
}

if (typeof window === "undefined" && typeof DOMParser === "undefined") {
  console.warn(
    "DOMParser is not available. In Node.js environment, please use a library like xmldom.",
  );
}
