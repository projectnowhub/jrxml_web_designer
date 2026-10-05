import { xmlAttr, cdata } from "./jrxml/xmlEscape";
import { DEFAULT_REPORT_FONT } from "../config/fonts.config";
// Import type definitions
import type { DesignElement, BandType, Band, ReportGroup } from "../types";
import type { ReportProperties, Field, Parameter } from "./jrxml/types";
import { buildJasperReportOpenTag } from "./jrxml/xmlBuilder";
import { generateUUID } from "./jrxml/uuidGenerator";
import {
  BOX_CORNER_RADIUS_PROPERTY,
  encodeCornerRadii,
  encodeSidePens,
  getLayeredBorder,
  getRoundedBorderPen,
  hasRoundedCorners,
  orUndefined,
  PAPER_COLOR,
  ROUNDED_BORDER_PENS_PROPERTY,
  ROUNDED_BORDER_PROPERTY,
  ROUNDED_MARKER,
  withoutLines,
} from "./framePresets";

import {
  floatsBelowTable,
  generateTableDatasetsXML,
  generateTableXML,
  withTableThemeStyles,
} from "./jrxml/tableXml";

export type { ReportProperties, Field, Parameter } from "./jrxml/types";

// Default font name
const DEFAULT_FONT = DEFAULT_REPORT_FONT;

// Helper function: ensure a coordinate value is an integer
function toInt(value: any): number {
  return parseInt(value as string) || 0;
}

// Generate the common reportElement attributes
function generateReportElementAttrs(element: any): string {
  let attrs = ` x="${xmlAttr(toInt(element.x))}" y="${xmlAttr(toInt(element.y))}" width="${xmlAttr(toInt(element.width))}" height="${xmlAttr(toInt(element.height))}"`;
  if (element.uuid) attrs += ` uuid="${xmlAttr(element.uuid)}"`;
  if (element.key) attrs += ` key="${xmlAttr(element.key)}"`;
  if (element.style) attrs += ` style="${xmlAttr(element.style)}"`;
  if (element.mode) attrs += ` mode="${xmlAttr(element.mode)}"`;
  if (element.positionType && element.positionType !== "FixRelativeToTop")
    attrs += ` positionType="${xmlAttr(element.positionType)}"`;
  if (element.stretchType && element.stretchType !== "NoStretch")
    attrs += ` stretchType="${xmlAttr(element.stretchType)}"`;
  if (element.isPrintRepeatedValues === false)
    attrs += ` isPrintRepeatedValues="false"`;
  if (element.isRemoveLineWhenBlank) attrs += ` isRemoveLineWhenBlank="true"`;
  if (element.forecolor) attrs += ` forecolor="${xmlAttr(element.forecolor)}"`;
  if (element.backcolor) attrs += ` backcolor="${xmlAttr(element.backcolor)}"`;
  return attrs;
}

// Generate reportElement child elements.
// The order follows the XSD sequence: property, propertyExpression, printWhenExpression,
// styleExpression (so persisted properties such as the image name stay schema valid).
function generateReportElementChildren(element: any): string {
  let xml = "";
  // Generate property elements
  if (element.properties && element.properties.length > 0) {
    element.properties.forEach((prop: any) => {
      if (prop.name) {
        xml += `<property name="${xmlAttr(prop.name)}" value="${xmlAttr(prop.value || "")}"/>`;
      }
    });
  }
  // Generate propertyExpression elements
  if (element.propertyExpressions && element.propertyExpressions.length > 0) {
    element.propertyExpressions.forEach((prop: any) => {
      if (prop.name) {
        xml += `<propertyExpression name="${xmlAttr(prop.name)}">${cdata(prop.valueExpression || "")}</propertyExpression>`;
      }
    });
  }
  if (element.printWhenExpression) {
    xml += `<printWhenExpression>${cdata(element.printWhenExpression)}</printWhenExpression>`;
  }
  if (element.styleExpression) {
    xml += `<styleExpression>${cdata(element.styleExpression)}</styleExpression>`;
  }
  return xml;
}

// Generate JRXML content
export function generateJRXMLContent(
  properties: ReportProperties,
  bands: Band[],
  fields: Field[],
  parameters: Parameter[] = [],
  subDatasets: any[] = [],
  styles: any[] = [],
  variables: any[] = [],
  reportProperties: any[] = [],
  groups: ReportGroup[] = [],
  totalPagesCount?: number,
): string {
  // Ensure the page margins have default values; use 0 if not set
  const safeProperties = {
    ...properties,
    leftMargin: properties.leftMargin || 0,
    rightMargin: properties.rightMargin || 0,
    topMargin: properties.topMargin || 0,
    bottomMargin: properties.bottomMargin || 0,
  };

  // Build a map of field names for quick lookup
  const fieldMap = new Map<string, Field>();
  fields.forEach((field) => {
    if (field.name) {
      fieldMap.set(field.name, field);
    }
  });

  // Walk all elements and collect the field names in use
  const usedFieldNames = new Set<string>();
  bands.forEach((band) => {
    band.elements.forEach((element) => {
      // Also check whether expressions contain field references
      if (element.type === "textField" && element.expression) {
        const fieldMatches = element.expression.match(/\$F\{([^}]+)\}/g);
        if (fieldMatches) {
          fieldMatches.forEach((match) => {
            const fieldName = match.substring(3, match.length - 1); // Strip the $F{ and }
            usedFieldNames.add(fieldName);
          });
        }
      }
    });
  });

  // Add any missing fields to the field list
  usedFieldNames.forEach((fieldName) => {
    if (!fieldMap.has(fieldName)) {
      fieldMap.set(fieldName, { name: fieldName, class: "java.lang.String" });
    }
  });

  // Get the updated field list
  const updatedFields = Array.from(fieldMap.values());

  // Build the JRXML, following the strict ordering required by the XSD spec
  let jrxml = buildJasperReportOpenTag(safeProperties);

  // ============================================================
  // Order 1: properties (report properties)
  // ============================================================
  if (reportProperties && reportProperties.length > 0) {
    jrxml += "<!-- Report properties -->";
    reportProperties.forEach((prop) => {
      if (prop.name && prop.value) {
        jrxml += `<property name="${xmlAttr(prop.name)}" value="${xmlAttr(prop.value)}"/>`;
      }
    });
  }

  // ============================================================
  // Order 5: reportFonts (report font definitions)
  // ============================================================
  jrxml += "<!-- Report font definitions -->";
  jrxml += `<reportFont name="reportFont" fontName="${xmlAttr(DEFAULT_FONT)}"/>`;

  // ============================================================
  // Order 6: styles (style definitions)
  // ============================================================
  // Theme styles of the report's tables are always written, even if the
  // user removed them from Style Management
  const allStyles = withTableThemeStyles(styles || [], bands);
  if (allStyles.length > 0) {
    jrxml += "<!-- Styles -->";
    allStyles.forEach((style) => {
      jrxml += generateStyleXML(style);
    });
  }

  // Add parameter definitions
  if (parameters.length > 0) {
    jrxml += "<!-- Report parameter definitions -->";
    parameters.forEach((param) => {
      if (param.name && param.class) {
        jrxml += `<parameter name="${xmlAttr(param.name)}" class="${xmlAttr(param.class)}">`;
        if (param.defaultValue !== undefined) {
          jrxml += `<defaultValueExpression>${cdata(param.defaultValue)}</defaultValueExpression>`;
        }
        jrxml += "</parameter>";
      }
    });
  }

  // Add the main report's query statement
  if (properties.query && properties.query.text) {
    jrxml += `<queryString language="${xmlAttr(properties.query.language || "sql")}">${cdata(properties.query.text)}</queryString>`;
  }

  // Add sub-dataset definitions
  if (subDatasets.length > 0) {
    jrxml += "<!-- Sub-dataset definitions -->";
    subDatasets.forEach((dataset) => {
      if (dataset.name) {
        let subDatasetAttrs = `name="${xmlAttr(dataset.name)}" uuid="${xmlAttr(dataset.uuid || generateUUID())}"`;
        if (dataset.scriptletClass) {
          subDatasetAttrs += ` scriptletClass="${xmlAttr(dataset.scriptletClass)}"`;
        }
        if (dataset.resourceBundle) {
          subDatasetAttrs += ` resourceBundle="${xmlAttr(dataset.resourceBundle)}"`;
        }
        if (dataset.whenResourceMissingType) {
          subDatasetAttrs += ` whenResourceMissingType="${xmlAttr(dataset.whenResourceMissingType)}"`;
        }
        jrxml += `<subDataset ${subDatasetAttrs}>
`;
        // Add dataset properties
        if (dataset.properties) {
          Object.entries(dataset.properties).forEach(([key, value]) => {
            jrxml += `<property name="${xmlAttr(key)}" value="${xmlAttr(value)}"/>`;
          });
        }

        // Add the query statement
        if (dataset.query && dataset.query.text) {
          jrxml += `<queryString language="${xmlAttr(dataset.query.language || "sql")}">${cdata(dataset.query.text)}</queryString>`;
        }

        // Add field definitions
        if (dataset.fields && dataset.fields.length > 0) {
          dataset.fields.forEach((field: any) => {
            if (field.name && field.class) {
              jrxml += `<field name="${xmlAttr(field.name)}" class="${xmlAttr(field.class)}">`;

              // Add field properties
              if (field.properties) {
                Object.entries(field.properties).forEach(([key, value]) => {
                  jrxml += `<property name="${xmlAttr(key)}" value="${xmlAttr(value)}"/>`;
                });
              }

              jrxml += `</field>`;
            }
          });
        }
        jrxml += "</subDataset>";
      }
    });
  }

  // Each data table has its own dataset; its rows are passed in by its name
  jrxml += generateTableDatasetsXML(bands);

  // Add field definitions
  if (updatedFields.length > 0) {
    jrxml += "<!-- Data field definitions -->";
    updatedFields.forEach((field) => {
      if (field.name && field.class) {
        // Check whether there are field properties to generate
        if (
          field.properties &&
          typeof field.properties === "object" &&
          !Array.isArray(field.properties)
        ) {
          jrxml += `<field name="${xmlAttr(field.name)}" class="${xmlAttr(field.class)}">`;
          Object.entries(field.properties).forEach(([key, value]) => {
            if (key && value) {
              jrxml += `<property name="${xmlAttr(key)}" value="${xmlAttr(value)}"/>`;
            }
          });
          jrxml += `</field>`;
        } else {
          jrxml += `<field name="${xmlAttr(field.name)}" class="${xmlAttr(field.class)}"/>`;
        }
      }
    });
  }

  // Add report variable definitions
  if (variables.length > 0) {
    jrxml += "<!-- Report variable definitions -->";
    variables.forEach((variable) => {
      if (variable.name && variable.class) {
        let attrs = `name="${xmlAttr(variable.name)}" class="${xmlAttr(variable.class)}" uuid="${xmlAttr(generateUUID())}"`;
        if (
          variable.calculationType &&
          variable.calculationType !== "Nothing"
        ) {
          attrs += ` calculation="${xmlAttr(variable.calculationType)}"`;
        }
        // Add the incrementType attribute (if not the default value "None")
        if (variable.incrementType && variable.incrementType !== "None") {
          attrs += ` incrementType="${xmlAttr(variable.incrementType)}"`;
        }
        // Add the incrementGroup attribute (if present)
        if (variable.incrementGroup) {
          attrs += ` incrementGroup="${xmlAttr(variable.incrementGroup)}"`;
        }
        // Add the calculationGroup attribute (if present)
        if (variable.calculationGroup) {
          attrs += ` calculationGroup="${xmlAttr(variable.calculationGroup)}"`;
        }
        if (variable.resetType) {
          attrs += ` resetType="${xmlAttr(variable.resetType)}"`;
        }
        if (variable.resetGroup) {
          attrs += ` resetGroup="${xmlAttr(variable.resetGroup)}"`;
        }
        // Add the isInitialized attribute (if not the default value false)
        if (variable.isInitialized) {
          attrs += ` isInitialized="true"`;
        }
        jrxml += `<variable ${attrs}>`;
        if (variable.expression) {
          jrxml += `<variableExpression>${cdata(variable.expression)}</variableExpression>`;
        }
        if (variable.initialValueExpression) {
          jrxml += `<initialValueExpression>${cdata(variable.initialValueExpression)}</initialValueExpression>`;
        }
        jrxml += "</variable>";
      }
    });
  }

  // Add report group definitions
  if (groups.length > 0) {
    jrxml += "<!-- Report group definitions -->";
    groups.forEach((group) => {
      if (group.name) {
        let groupAttrs = `name="${xmlAttr(group.name)}" uuid="${xmlAttr(generateUUID())}"`;
        if (group.isStartNewPage) groupAttrs += ' isStartNewPage="true"';
        // Add the isStartNewColumn attribute (if not the default value false)
        if (group.isStartNewColumn) groupAttrs += ' isStartNewColumn="true"';
        if (group.isRepeatHeader) groupAttrs += ' isRepeatHeader="true"';
        // Add the isReprintHeaderOnEachPage attribute (if not the default value false)
        if (group.isReprintHeaderOnEachPage)
          groupAttrs += ' isReprintHeaderOnEachPage="true"';
        if (group.isResetPageNumber) groupAttrs += ' isResetPageNumber="true"';
        // Add the isHideColumnHeader attribute (if not the default value false)
        if (group.isHideColumnHeader)
          groupAttrs += ' isHideColumnHeader="true"';
        // Add the isKeepTogether attribute (if not the default value false)
        if (group.isKeepTogether) groupAttrs += ' isKeepTogether="true"';
        // Add the isKeepFooterTogether attribute (if not the default value false)
        if (group.isKeepFooterTogether)
          groupAttrs += ' isKeepFooterTogether="true"';
        // Add the minHeightToStartNewPage attribute (if not the default value 0)
        if (
          group.minHeightToStartNewPage &&
          group.minHeightToStartNewPage > 0
        ) {
          groupAttrs += ` minHeightToStartNewPage="${xmlAttr(group.minHeightToStartNewPage)}"`;
        }
        jrxml += `<group ${groupAttrs}>`;
        if (group.expression) {
          jrxml += `<groupExpression>${cdata(group.expression)}</groupExpression>`;
        }
        if (
          group.header &&
          (group.header.elements.length > 0 || group.header.height > 0)
        ) {
          jrxml += `<groupHeader>`;
          jrxml += `<band height="${xmlAttr(group.header.height)}">`;
          group.header.elements.forEach((element) => {
            const validatedElement = validateElementPosition(element);
            jrxml += generateElementXML(validatedElement);
          });
          jrxml += `</band>`;
          jrxml += `</groupHeader>`;
        }
        if (
          group.footer &&
          (group.footer.elements.length > 0 || group.footer.height > 0)
        ) {
          jrxml += `<groupFooter>`;
          jrxml += `<band height="${xmlAttr(group.footer.height)}">`;
          group.footer.elements.forEach((element) => {
            const validatedElement = validateElementPosition(element);
            jrxml += generateElementXML(validatedElement);
          });
          jrxml += `</band>`;
          jrxml += `</groupFooter>`;
        }
        jrxml += "</group>";
      }
    });
  }

  // Add report bands. The XSD requires <background> before every other band,
  // while the designer keeps it at the end of its band list.
  const orderedBands = [
    ...bands.filter((band) => band.type === "background"),
    ...bands.filter((band) => band.type !== "background"),
  ];
  orderedBands.forEach((band) => {
    if (band.elements.length > 0 || band.height > 0) {
      if (band.type === "detail") {
        // Check for multi-page detail
        let maxPageIndex = 0;
        band.elements.forEach((el) => {
          if (el.pageIndex !== undefined && el.pageIndex > maxPageIndex) {
            maxPageIndex = el.pageIndex;
          }
        });
        const numPages = Math.max(
          safeProperties.pageCount || 1,
          maxPageIndex + 1,
          totalPagesCount || 1,
        );

        if (numPages > 1) {
          jrxml += `<detail>`;
          const colWidth =
            safeProperties.pageWidth -
            safeProperties.leftMargin -
            safeProperties.rightMargin;
          for (let p = 0; p < numPages; p++) {
            const pageElements = band.elements.filter(
              (el) => (el.pageIndex ?? 0) === p,
            );
            const bandHeight = band.height > 0 ? band.height : 100;
            let bandAttrs = `height="${xmlAttr(bandHeight)}"`;
            if (band.splitType) {
              bandAttrs += ` splitType="${xmlAttr(band.splitType)}"`;
            } else {
              bandAttrs += ` splitType="Stretch"`;
            }

            jrxml += `<band ${bandAttrs}>`;
            if (p > 0) {
              // Standard JasperReports page break at top of subsequent detail page bands
              jrxml += `<break type="Page"><reportElement x="0" y="0" width="${xmlAttr(colWidth)}" height="1" uuid="${xmlAttr(generateUUID())}"/></break>`;
            }
            pageElements.forEach((element) => {
              const validatedElement = withTableFloat(
                validateElementPosition(element),
                pageElements,
              );
              jrxml += generateElementXML(validatedElement);
            });
            jrxml += `</band>`;
          }
          jrxml += `</detail>`;
          return;
        }
      }

      jrxml += `<${band.type}>`;

      // Per the XSD spec, the height attribute belongs on the band element, but band does not allow a uuid attribute
      let bandAttributes = `height="${xmlAttr(band.height)}"`;

      // Prefer the non-deprecated splitType attribute; only fall back to the deprecated isSplitAllowed attribute if splitType is absent
      if (band.splitType) {
        // If splitType is already specified, use it directly
        bandAttributes += ` splitType="${xmlAttr(band.splitType)}"`;
      } else if (band.isSplitAllowed !== undefined) {
        // Only use the deprecated isSplitAllowed attribute if splitType is absent
        const splitTypeValue = band.isSplitAllowed ? "Stretch" : "Prevent";
        bandAttributes += ` splitType="${xmlAttr(splitTypeValue)}"`;
      }

      jrxml += `<band ${bandAttributes}>`;

      // Add the elements within the band, validating element positions per the band type
      band.elements.forEach((element) => {
        // Validate the position of each element using the current band type's height limit
        const validatedElement = withTableFloat(
          validateElementPosition(element),
          band.elements,
        );
        jrxml += generateElementXML(validatedElement);
      });

      jrxml += `</band></${band.type}>`;
    }
  });

  jrxml += "</jasperReport>";
  return jrxml;
}

// Look attributes of a <style> (or a conditional style's <style>). The
// JasperReports schema takes font and alignment as attributes here, not as a
// <textElement> child as on text elements.
function styleAttributesXML(style: any): string {
  let attrs = "";
  if (style.mode) attrs += ` mode="${xmlAttr(style.mode)}"`;
  if (style.forecolor) attrs += ` forecolor="${xmlAttr(style.forecolor)}"`;
  if (style.backcolor) attrs += ` backcolor="${xmlAttr(style.backcolor)}"`;
  if (style.textAlignment) attrs += ` hTextAlign="${xmlAttr(style.textAlignment)}"`;
  if (style.verticalAlignment) attrs += ` vTextAlign="${xmlAttr(style.verticalAlignment)}"`;
  if (style.fontFamily || style.fontSize || style.isBold || style.isItalic || style.isUnderline) {
    attrs += ` fontName="${xmlAttr(style.fontFamily || DEFAULT_FONT)}"`;
    if (style.fontSize) attrs += ` fontSize="${xmlAttr(style.fontSize)}"`;
    if (style.isBold) attrs += ` isBold="true"`;
    if (style.isItalic) attrs += ` isItalic="true"`;
    if (style.isUnderline) attrs += ` isUnderline="true"`;
  }
  return attrs;
}

// Generate style XML (schema order: box, then conditional styles)
function generateStyleXML(style: any): string {
  if (!style.name) return "";

  let xml = `<style name="${xmlAttr(style.name)}"`;
  // The parent style is the "style" attribute
  if (style.parentStyle) xml += ` style="${xmlAttr(style.parentStyle)}"`;
  xml += `${styleAttributesXML(style)}>`;

  if (style.box) {
    xml += generateBoxXML(style.box, style);
  }

  (style.conditionalStyles || []).forEach((cs: any) => {
    xml += "<conditionalStyle>";
    if (cs.conditionExpression) {
      xml += `<conditionExpression>${cdata(cs.conditionExpression)}</conditionExpression>`;
    }
    xml += `<style${styleAttributesXML(cs.properties || {})}>`;
    if (cs.properties?.box) xml += generateBoxXML(cs.properties.box);
    xml += "</style></conditionalStyle>";
  });

  xml += `</style>`;
  return xml;
}

// Generate element XML
function generateElementXML(element: any): string {
  switch (element.type) {
    case "empty":
      return "";
    case "textField":
      return generateTextFieldXML(element);
    case "image":
      return generateImageXML(element);
    case "line":
      return generateLineXML(element);
    case "rectangle":
      return generateRectangleXML(element);
    case "ellipse":
      return generateEllipseXML(element);
    case "frame":
      return generateFrameXML(element);
    case "table":
      return generateTableXML(element, generateReportElementAttrs(element));
    case "chart":
      return generateChartXML(element);
    case "barcode":
      return generateBarcodeXML(element);
    default:
      return "";
  }
}

// Generate box element XML
function generateBoxXML(box: any, element: any = {}): string {
  // If there's no box object, create a temporary one
  const boxData = box || {};

  // Check for border attributes stored directly at the element's root level (for backward compatibility)
  if (
    !boxData.pen &&
    (element.borderWidth || element.borderStyle || element.borderColor)
  ) {
    boxData.pen = {
      lineWidth: element.borderWidth,
      lineStyle: element.borderStyle,
      lineColor: element.borderColor,
    };
  }

  // Check whether any padding is set
  const hasPadding =
    boxData.padding !== undefined &&
    boxData.padding !== "" &&
    boxData.padding !== 0;
  const hasTopPadding =
    boxData.topPadding !== undefined &&
    boxData.topPadding !== "" &&
    boxData.topPadding !== 0;
  const hasLeftPadding =
    boxData.leftPadding !== undefined &&
    boxData.leftPadding !== "" &&
    boxData.leftPadding !== 0;
  const hasBottomPadding =
    boxData.bottomPadding !== undefined &&
    boxData.bottomPadding !== "" &&
    boxData.bottomPadding !== 0;
  const hasRightPadding =
    boxData.rightPadding !== undefined &&
    boxData.rightPadding !== "" &&
    boxData.rightPadding !== 0;

  // Check for pen-format border data (not deprecated)
  const hasTopPen =
    boxData.topPen &&
    boxData.topPen.lineWidth !== undefined &&
    boxData.topPen.lineWidth > 0;
  const hasLeftPen =
    boxData.leftPen &&
    boxData.leftPen.lineWidth !== undefined &&
    boxData.leftPen.lineWidth > 0;
  const hasBottomPen =
    boxData.bottomPen &&
    boxData.bottomPen.lineWidth !== undefined &&
    boxData.bottomPen.lineWidth > 0;
  const hasRightPen =
    boxData.rightPen &&
    boxData.rightPen.lineWidth !== undefined &&
    boxData.rightPen.lineWidth > 0;
  const hasPen =
    boxData.pen &&
    boxData.pen.lineWidth !== undefined &&
    boxData.pen.lineWidth > 0;

  // Check for direct-format border data (deprecated, but kept for backward compatibility)
  const hasGlobalBorderWidth =
    boxData.borderWidth !== undefined && boxData.borderWidth > 0;
  const hasGlobalBorderStyle =
    boxData.borderStyle !== undefined && boxData.borderStyle !== "";

  // If there's no border or padding set at all, don't generate the box tag
  if (
    !hasPen &&
    !hasTopPen &&
    !hasLeftPen &&
    !hasBottomPen &&
    !hasRightPen &&
    !hasGlobalBorderWidth &&
    !hasGlobalBorderStyle &&
    !hasPadding &&
    !hasTopPadding &&
    !hasLeftPadding &&
    !hasBottomPadding &&
    !hasRightPadding
  ) {
    return "";
  }

  let xml = "<box";

  // Add non-deprecated box attributes (padding-related)
  if (boxData.padding !== undefined && boxData.padding !== "") {
    const paddingValue = boxData.padding === "" ? 0 : boxData.padding;
    xml += ` padding="${xmlAttr(paddingValue)}"`;
  }
  if (boxData.topPadding !== undefined && boxData.topPadding !== "") {
    const topPaddingValue = boxData.topPadding === "" ? 0 : boxData.topPadding;
    xml += ` topPadding="${xmlAttr(topPaddingValue)}"`;
  }
  if (boxData.leftPadding !== undefined && boxData.leftPadding !== "") {
    const leftPaddingValue =
      boxData.leftPadding === "" ? 0 : boxData.leftPadding;
    xml += ` leftPadding="${xmlAttr(leftPaddingValue)}"`;
  }
  if (boxData.bottomPadding !== undefined && boxData.bottomPadding !== "") {
    const bottomPaddingValue =
      boxData.bottomPadding === "" ? 0 : boxData.bottomPadding;
    xml += ` bottomPadding="${xmlAttr(bottomPaddingValue)}"`;
  }
  if (boxData.rightPadding !== undefined && boxData.rightPadding !== "") {
    const rightPaddingValue =
      boxData.rightPadding === "" ? 0 : boxData.rightPadding;
    xml += ` rightPadding="${xmlAttr(rightPaddingValue)}"`;
  }

  xml += ">";

  // Prefer the pen format (not deprecated); otherwise fall back to the direct format (deprecated, for backward compatibility)
  // 1. Handle the global border
  if (hasPen) {
    xml += "<pen";
    if (boxData.pen.lineWidth !== undefined && boxData.pen.lineWidth !== null) {
      let lineWidth = boxData.pen.lineWidth;
      if (typeof lineWidth === "string") {
        if (lineWidth === "1Point" || lineWidth === "Thin") lineWidth = 1;
        else if (lineWidth === "2Point") lineWidth = 2;
        else if (lineWidth === "4Point") lineWidth = 4;
        else if (/^\d+$/.test(lineWidth)) lineWidth = parseInt(lineWidth);
      }
      xml += ` lineWidth="${xmlAttr(lineWidth)}"`;
    }
    if (
      boxData.pen.lineStyle &&
      boxData.pen.lineStyle !== null &&
      boxData.pen.lineStyle !== ""
    )
      xml += ` lineStyle="${xmlAttr(boxData.pen.lineStyle)}"`;
    if (boxData.pen.lineColor && boxData.pen.lineColor !== null)
      xml += ` lineColor="${xmlAttr(boxData.pen.lineColor)}"`;
    xml += "/>";
  } else if (hasGlobalBorderWidth || hasGlobalBorderStyle) {
    // Fall back to the direct format (deprecated)
    xml += "<pen";
    if (
      boxData.borderWidth !== undefined &&
      boxData.borderWidth !== null &&
      boxData.borderWidth > 0
    ) {
      xml += ` lineWidth="${xmlAttr(boxData.borderWidth)}"`;
    }
    if (
      boxData.borderStyle !== undefined &&
      boxData.borderStyle !== null &&
      boxData.borderStyle !== ""
    ) {
      xml += ` lineStyle="${xmlAttr(boxData.borderStyle)}"`;
    }
    if (boxData.borderColor !== undefined && boxData.borderColor !== null) {
      xml += ` lineColor="${xmlAttr(boxData.borderColor)}"`;
    }
    xml += "/>";
  }

  // 2. Handle the per-side pens (not deprecated)
  // Top border
  if (hasTopPen) {
    xml += "<topPen";
    let lineWidth = boxData.topPen.lineWidth;
    if (typeof lineWidth === "string") {
      if (lineWidth === "1Point" || lineWidth === "Thin") lineWidth = 1;
      else if (lineWidth === "2Point") lineWidth = 2;
      else if (lineWidth === "4Point") lineWidth = 4;
      else if (/^\d+$/.test(lineWidth)) lineWidth = parseInt(lineWidth);
    }
    xml += ` lineWidth="${xmlAttr(lineWidth)}"`;
    if (
      boxData.topPen.lineStyle &&
      boxData.topPen.lineStyle !== null &&
      boxData.topPen.lineStyle !== ""
    )
      xml += ` lineStyle="${xmlAttr(boxData.topPen.lineStyle)}"`;
    if (boxData.topPen.lineColor && boxData.topPen.lineColor !== null)
      xml += ` lineColor="${xmlAttr(boxData.topPen.lineColor)}"`;
    xml += "/>";
  }

  // Left border
  if (hasLeftPen) {
    xml += "<leftPen";
    let lineWidth = boxData.leftPen.lineWidth;
    if (typeof lineWidth === "string") {
      if (lineWidth === "1Point" || lineWidth === "Thin") lineWidth = 1;
      else if (lineWidth === "2Point") lineWidth = 2;
      else if (lineWidth === "4Point") lineWidth = 4;
      else if (/^\d+$/.test(lineWidth)) lineWidth = parseInt(lineWidth);
    }
    xml += ` lineWidth="${xmlAttr(lineWidth)}"`;
    if (
      boxData.leftPen.lineStyle &&
      boxData.leftPen.lineStyle !== null &&
      boxData.leftPen.lineStyle !== ""
    )
      xml += ` lineStyle="${xmlAttr(boxData.leftPen.lineStyle)}"`;
    if (boxData.leftPen.lineColor && boxData.leftPen.lineColor !== null)
      xml += ` lineColor="${xmlAttr(boxData.leftPen.lineColor)}"`;
    xml += "/>";
  }

  // Bottom border
  if (hasBottomPen) {
    xml += "<bottomPen";
    let lineWidth = boxData.bottomPen.lineWidth;
    if (typeof lineWidth === "string") {
      if (lineWidth === "1Point" || lineWidth === "Thin") lineWidth = 1;
      else if (lineWidth === "2Point") lineWidth = 2;
      else if (lineWidth === "4Point") lineWidth = 4;
      else if (/^\d+$/.test(lineWidth)) lineWidth = parseInt(lineWidth);
    }
    xml += ` lineWidth="${xmlAttr(lineWidth)}"`;
    if (
      boxData.bottomPen.lineStyle &&
      boxData.bottomPen.lineStyle !== null &&
      boxData.bottomPen.lineStyle !== ""
    )
      xml += ` lineStyle="${xmlAttr(boxData.bottomPen.lineStyle)}"`;
    if (boxData.bottomPen.lineColor && boxData.bottomPen.lineColor !== null)
      xml += ` lineColor="${xmlAttr(boxData.bottomPen.lineColor)}"`;
    xml += "/>";
  }

  // Right border
  if (hasRightPen) {
    xml += "<rightPen";
    let lineWidth = boxData.rightPen.lineWidth;
    if (typeof lineWidth === "string") {
      if (lineWidth === "1Point" || lineWidth === "Thin") lineWidth = 1;
      else if (lineWidth === "2Point") lineWidth = 2;
      else if (lineWidth === "4Point") lineWidth = 4;
      else if (/^\d+$/.test(lineWidth)) lineWidth = parseInt(lineWidth);
    }
    xml += ` lineWidth="${xmlAttr(lineWidth)}"`;
    if (
      boxData.rightPen.lineStyle &&
      boxData.rightPen.lineStyle !== null &&
      boxData.rightPen.lineStyle !== ""
    )
      xml += ` lineStyle="${xmlAttr(boxData.rightPen.lineStyle)}"`;
    if (boxData.rightPen.lineColor && boxData.rightPen.lineColor !== null)
      xml += ` lineColor="${xmlAttr(boxData.rightPen.lineColor)}"`;
    xml += "/>";
  }

  xml += "</box>";
  return xml;
}

// Validate and adjust element position, ensuring it stays within the band bounds
function validateElementPosition(element: any): any {
  if (!element) return element;

  // Create a copy of the element to avoid mutating the original object
  const validatedElement = { ...element };

  // Ensure the element has default non-negative values
  validatedElement.x = Math.max(0, validatedElement.x ?? 0);
  validatedElement.y = Math.max(0, validatedElement.y ?? 0);
  validatedElement.width = Math.max(1, Math.abs(validatedElement.width ?? 100));
  validatedElement.height = Math.max(
    1,
    Math.abs(validatedElement.height ?? 20),
  );
  return validatedElement;
}

// Items below a table move down with it when it grows past its design height
function withTableFloat(element: any, siblings: DesignElement[]): any {
  return floatsBelowTable(element, siblings) ? { ...element, positionType: "Float" } : element;
}

// Get the default height for a band type
function getDefaultBandHeight(bandType: string): number {
  switch (bandType) {
    case "pageHeader":
      return 40;
    case "columnHeader":
      return 30;
    case "detail":
      return 353; // Default detail band height
    case "columnFooter":
      return 30;
    case "pageFooter":
      return 40;
    default:
      return 50;
  }
}

// Generate text field XML
function generateTextFieldXML(element: any): string {
  let xml = `<textField`;

  // Add textField-specific attributes, ensuring compliance with the XSD spec
  // Text overflow is not edited in the designer; an imported report's setting
  // is written back unchanged. Designs saved before textAdjust use the old
  // isStretchWithOverflow flag (only "true" differs from the default, CutText).
  if (element.textAdjust) {
    xml += ` textAdjust="${xmlAttr(element.textAdjust)}"`;
  } else if (element.isStretchWithOverflow === true) {
    xml += ` textAdjust="StretchHeight"`;
  }

  if (element.evaluationTime && element.evaluationTime !== "Now") {
    // Ensure evaluationTime conforms to the values allowed by the DTD
    const validEvaluationTimes = [
      "Report",
      "Page",
      "Column",
      "Group",
      "Band",
      "Auto",
      "Master",
    ];
    if (validEvaluationTimes.includes(element.evaluationTime)) {
      xml += ` evaluationTime="${xmlAttr(element.evaluationTime)}"`;
    }
    if (element.evaluationTime === "Group" && element.evaluationGroup) {
      xml += ` evaluationGroup="${xmlAttr(element.evaluationGroup)}"`;
    }
  }

  if (element.pattern) {
    xml += ` pattern="${xmlAttr(element.pattern)}"`;
  }

  if (element.isBlankWhenNull !== undefined) {
    xml += ` isBlankWhenNull="${xmlAttr(element.isBlankWhenNull)}"`;
  }

  // New: hyperlink attribute
  if (element.hyperlinkType && element.hyperlinkType !== "None") {
    xml += ` hyperlinkType="${xmlAttr(element.hyperlinkType)}"`;
  }

  // New: bookmark level
  if (element.bookmarkLevel !== undefined && element.bookmarkLevel > 0) {
    xml += ` bookmarkLevel="${xmlAttr(element.bookmarkLevel)}"`;
  }

  xml += `><reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;

  xml += "</reportElement>";

  // Generate the box element
  xml += generateBoxXML(element.box, element);

  // Add the text element configuration, ensuring textAlignment conforms to the DTD
  let textElementAttrs = "";

  // The rotation attribute belongs on textElement, not on reportElement
  if (
    element.rotation &&
    ["None", "Left", "Right", "UpsideDown"].includes(element.rotation)
  ) {
    textElementAttrs += ` rotation="${xmlAttr(element.rotation)}"`;
  }

  if (
    element.textAlignment &&
    ["Left", "Center", "Right", "Justified"].includes(element.textAlignment)
  ) {
    textElementAttrs += ` textAlignment="${xmlAttr(element.textAlignment)}"`;
  }

  if (
    element.verticalAlignment &&
    ["Top", "Middle", "Bottom"].includes(element.verticalAlignment)
  ) {
    textElementAttrs += ` verticalAlignment="${xmlAttr(element.verticalAlignment)}"`;
  }

  // Markup attribute: the legacy isStyledText flag when no markup is set,
  // else default to html, or auto-detect if HTML tags exist
  let markup =
    element.markup ??
    (element.isStyledText !== undefined
      ? element.isStyledText
        ? "styled"
        : "none"
      : undefined);
  if (!markup || markup === "none") {
    if (element.expression && /<(b|strong|i|em|u|s|strike|del|font|a|span)\b[^>]*>/i.test(element.expression)) {
      markup = "html";
    }
  }
  if (!markup) {
    markup = "html";
  }

  if (markup !== "none") {
    textElementAttrs += ` markup="${xmlAttr(markup)}"`;
  }

  xml += `<textElement${textElementAttrs}>`;

  // Add the font configuration
  let fontAttrs = "";
  // Add the font name attribute (defaults to DEFAULT_FONT)
  fontAttrs += ` fontName="${xmlAttr(element.fontFamily || DEFAULT_FONT)}"`;
  if (element.fontSize) {
    fontAttrs += ` size="${xmlAttr(element.fontSize)}"`;
  }

  if (element.isBold) {
    fontAttrs += ' isBold="true"';
  }

  if (element.isItalic) {
    fontAttrs += ' isItalic="true"';
  }

  if (element.isUnderline) {
    fontAttrs += ' isUnderline="true"';
  }

  xml += `<font${fontAttrs}/></textElement>`;

  let expression = element.expression;
  if (!expression && element.fieldName) {
    expression = `$F{${element.fieldName}}`;
  }

  if (expression) {
    let cleanExpression = expression;
    if (cleanExpression.startsWith('"') && cleanExpression.endsWith('"') && cleanExpression.length >= 2) {
      const inner = cleanExpression.slice(1, -1);
      const escapedInner = inner
        .replace(/\\"/g, '"')
        .replace(/"/g, '\\"')
        .replace(/\r\n|\r|\n/g, '\\n');
      cleanExpression = `"${escapedInner}"`;
    }
    xml += `<textFieldExpression>${cdata(cleanExpression)}</textFieldExpression>`;
  }

  // New: pattern expression
  if (element.patternExpression) {
    xml += `<patternExpression>${cdata(element.patternExpression)}</patternExpression>`;
  }

  // New: anchor name expression
  if (element.anchorNameExpression) {
    xml += `<anchorNameExpression>${cdata(element.anchorNameExpression)}</anchorNameExpression>`;
  }

  // New: bookmark level expression
  if (element.bookmarkLevelExpression) {
    xml += `<bookmarkLevelExpression>${cdata(element.bookmarkLevelExpression)}</bookmarkLevelExpression>`;
  }

  // New: hyperlink expression
  if (element.hyperlinkReferenceExpression) {
    xml += `<hyperlinkReferenceExpression>${cdata(element.hyperlinkReferenceExpression)}</hyperlinkReferenceExpression>`;
  }

  // New: hyperlink condition expression
  if (element.hyperlinkWhenExpression) {
    xml += `<hyperlinkWhenExpression>${cdata(element.hyperlinkWhenExpression)}</hyperlinkWhenExpression>`;
  }

  // New: hyperlink anchor expression
  if (element.hyperlinkAnchorExpression) {
    xml += `<hyperlinkAnchorExpression>${cdata(element.hyperlinkAnchorExpression)}</hyperlinkAnchorExpression>`;
  }

  // New: hyperlink page expression
  if (element.hyperlinkPageExpression) {
    xml += `<hyperlinkPageExpression>${cdata(element.hyperlinkPageExpression)}</hyperlinkPageExpression>`;
  }

  // New: hyperlink tooltip expression
  if (element.hyperlinkTooltipExpression) {
    xml += `<hyperlinkTooltipExpression>${cdata(element.hyperlinkTooltipExpression)}</hyperlinkTooltipExpression>`;
  }
  if (element.patternExpression) {
    xml += `<patternExpression>${cdata(element.patternExpression)}</patternExpression>`;
  }

  xml += `</textField>`;
  return xml;
}

// Generate image XML
function generateImageXML(element: any): string {
  let xml = `<image`;

  // Support two attribute names: scaleType (new) and scaleImage (deprecated, for backward compatibility)
  const scaleValue = element.scaleType || element.scaleImage;
  if (
    scaleValue &&
    ["Clip", "FillFrame", "RetainShape", "RealHeight", "RealSize"].includes(
      scaleValue,
    )
  ) {
    xml += ` scaleImage="${xmlAttr(scaleValue)}"`;
  }

  // Handle horizontal alignment
  if (element.hAlign && ["Left", "Center", "Right"].includes(element.hAlign)) {
    xml += ` hAlign="${xmlAttr(element.hAlign)}"`;
  }

  // Handle vertical alignment
  if (element.vAlign && ["Top", "Middle", "Bottom"].includes(element.vAlign)) {
    xml += ` vAlign="${xmlAttr(element.vAlign)}"`;
  }

  // Rotation
  if (
    element.rotation &&
    ["None", "Left", "Right", "UpsideDown"].includes(element.rotation)
  ) {
    xml += ` rotation="${xmlAttr(element.rotation)}"`;
  }

  // New: whether to use caching
  if (element.isUsingCache !== undefined) {
    xml += ` isUsingCache="${xmlAttr(element.isUsingCache)}"`;
  }

  // New: whether to lazy-load
  if (element.isLazy !== undefined && element.isLazy) {
    xml += ` isLazy="true"`;
  }

  // New: error handling type
  if (
    element.onErrorType &&
    ["Error", "Blank", "Icon"].includes(element.onErrorType)
  ) {
    xml += ` onErrorType="${xmlAttr(element.onErrorType)}"`;
  }

  // New: evaluation time
  if (element.evaluationTime && element.evaluationTime !== "Now") {
    const validEvaluationTimes = ["Report", "Page", "Column", "Band"];
    if (validEvaluationTimes.includes(element.evaluationTime)) {
      xml += ` evaluationTime="${xmlAttr(element.evaluationTime)}"`;
    }
  }

  // New: hyperlink type
  if (element.hyperlinkType && element.hyperlinkType !== "None") {
    xml += ` hyperlinkType="${xmlAttr(element.hyperlinkType)}"`;
  }

  // New: bookmark level
  if (element.bookmarkLevel !== undefined && element.bookmarkLevel > 0) {
    xml += ` bookmarkLevel="${xmlAttr(element.bookmarkLevel)}"`;
  }

  xml += `>
      <reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;
  xml += "</reportElement>";

  // Generate the box element
  xml += generateBoxXML(element.box, element);

  const imageExpressionValue = element.imageExpression || '""';
  xml += `<imageExpression>${cdata(imageExpressionValue)}</imageExpression>`;

  // New: anchor name expression
  if (element.anchorNameExpression) {
    xml += `<anchorNameExpression>${cdata(element.anchorNameExpression)}</anchorNameExpression>`;
  }

  // New: bookmark level expression
  if (element.bookmarkLevelExpression) {
    xml += `<bookmarkLevelExpression>${cdata(element.bookmarkLevelExpression)}</bookmarkLevelExpression>`;
  }

  // New: hyperlink expression
  if (element.hyperlinkReferenceExpression) {
    xml += `<hyperlinkReferenceExpression>${cdata(element.hyperlinkReferenceExpression)}</hyperlinkReferenceExpression>`;
  }

  // New: hyperlink condition expression
  if (element.hyperlinkWhenExpression) {
    xml += `<hyperlinkWhenExpression>${cdata(element.hyperlinkWhenExpression)}</hyperlinkWhenExpression>`;
  }

  // New: hyperlink anchor expression
  if (element.hyperlinkAnchorExpression) {
    xml += `<hyperlinkAnchorExpression>${cdata(element.hyperlinkAnchorExpression)}</hyperlinkAnchorExpression>`;
  }

  // New: hyperlink page expression
  if (element.hyperlinkPageExpression) {
    xml += `<hyperlinkPageExpression>${cdata(element.hyperlinkPageExpression)}</hyperlinkPageExpression>`;
  }

  // New: hyperlink tooltip expression
  if (element.hyperlinkTooltipExpression) {
    xml += `<hyperlinkTooltipExpression>${cdata(element.hyperlinkTooltipExpression)}</hyperlinkTooltipExpression>`;
  }

  xml += `</image>`;
  return xml;
}

// Generate line XML
function generateLineXML(element: any): string {
  // Handle the deprecated direction attribute, converting it to the direction attribute
  const direction = element.lineDirection || element.direction || "TopDown"; // Defaults to TopDown per the XSD
  let xml = `<line direction="${xmlAttr(direction)}">`;
  xml += `<reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;
  xml += "</reportElement>";

  // Generate the graphicElement (the line's pen settings)
  const hasLineWidth = element.lineWidth !== undefined && element.lineWidth > 0;
  const hasLineColor =
    element.lineColor !== undefined && element.lineColor !== "";
  const hasLineStyle =
    element.lineStyle !== undefined && element.lineStyle !== "";
  const hasFill = element.fill !== undefined && element.fill !== "";
  const hasPen =
    element.pen &&
    (element.pen.lineWidth !== undefined ||
      element.pen.lineStyle ||
      element.pen.lineColor);

  if (hasLineWidth || hasLineColor || hasLineStyle || hasFill || hasPen) {
    xml += "<graphicElement";
    if (hasFill) {
      xml += ` fill="${xmlAttr(element.fill)}"`;
    }
    xml += ">";

    // Prefer graphicElement's pen; otherwise build the pen from the element's direct attributes
    if (hasPen) {
      xml += "<pen";
      if (element.pen.lineWidth !== undefined)
        xml += ` lineWidth="${xmlAttr(element.pen.lineWidth)}"`;
      if (element.pen.lineStyle) xml += ` lineStyle="${xmlAttr(element.pen.lineStyle)}"`;
      if (element.pen.lineColor) xml += ` lineColor="${xmlAttr(element.pen.lineColor)}"`;
      xml += "/>";
    } else if (hasLineWidth || hasLineColor || hasLineStyle) {
      xml += "<pen";
      if (hasLineWidth) xml += ` lineWidth="${xmlAttr(element.lineWidth)}"`;
      if (hasLineStyle) xml += ` lineStyle="${xmlAttr(element.lineStyle)}"`;
      if (hasLineColor) xml += ` lineColor="${xmlAttr(element.lineColor)}"`;
      xml += "/>";
    }

    xml += "</graphicElement>";
  }

  xml += "</line>";
  return xml;
}

// Generate rectangle XML
function generateRectangleXML(element: any): string {
  let xml = "<rectangle";

  if (element.radius !== undefined && element.radius > 0) {
    xml += ` radius="${xmlAttr(element.radius)}"`;
  }

  xml += `><reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;
  xml += "</reportElement>";

  // Generate graphicElement
  let hasGraphicElement = false;
  let graphicElementXml = "<graphicElement";

  if (element.fill) {
    graphicElementXml += ` fill="${xmlAttr(element.fill)}"`;
    hasGraphicElement = true;
  }

  graphicElementXml += ">";

  // Generate pen
  const rectPenLineWidth = element.pen?.lineWidth ?? element.lineWidth;
  const rectPenLineStyle = element.pen?.lineStyle || element.lineStyle;
  const rectPenLineColor = element.pen?.lineColor || element.lineColor;

  if (
    rectPenLineWidth !== undefined ||
    rectPenLineStyle ||
    rectPenLineColor
  ) {
    hasGraphicElement = true;
    graphicElementXml += "<pen";
    if (rectPenLineWidth !== undefined)
      graphicElementXml += ` lineWidth="${xmlAttr(rectPenLineWidth)}"`;
    if (rectPenLineStyle)
      graphicElementXml += ` lineStyle="${xmlAttr(rectPenLineStyle)}"`;
    if (rectPenLineColor)
      graphicElementXml += ` lineColor="${xmlAttr(rectPenLineColor)}"`;
    graphicElementXml += "/>";
  }

  graphicElementXml += "</graphicElement>";

  if (hasGraphicElement) {
    xml += graphicElementXml;
  }

  xml += "</rectangle>";
  return xml;
}

// Generate ellipse XML
function generateEllipseXML(element: any): string {
  let xml = `<ellipse><reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;
  xml += "</reportElement>";

  // Generate graphicElement
  let hasGraphicElement = false;
  let graphicElementXml = "<graphicElement";

  if (element.fill) {
    graphicElementXml += ` fill="${xmlAttr(element.fill)}"`;
    hasGraphicElement = true;
  }

  graphicElementXml += ">";

  // Generate pen
  const ellipsePenLineWidth = element.pen?.lineWidth ?? element.lineWidth;
  const ellipsePenLineStyle = element.pen?.lineStyle || element.lineStyle;
  const ellipsePenLineColor = element.pen?.lineColor || element.lineColor;

  if (
    ellipsePenLineWidth !== undefined ||
    ellipsePenLineStyle ||
    ellipsePenLineColor
  ) {
    hasGraphicElement = true;
    graphicElementXml += "<pen";
    if (ellipsePenLineWidth !== undefined)
      graphicElementXml += ` lineWidth="${xmlAttr(ellipsePenLineWidth)}"`;
    if (ellipsePenLineStyle)
      graphicElementXml += ` lineStyle="${xmlAttr(ellipsePenLineStyle)}"`;
    if (ellipsePenLineColor)
      graphicElementXml += ` lineColor="${xmlAttr(ellipsePenLineColor)}"`;
    graphicElementXml += "/>";
  }

  graphicElementXml += "</graphicElement>";

  if (hasGraphicElement) {
    xml += graphicElementXml;
  }

  xml += "</ellipse>";
  return xml;
}

// Generate frame (container) XML
function generateFrameXML(element: any): string {
  // Rounded corners: the frame's lines and fill move to a rounded rectangle
  // drawn as its first child (see ROUNDED_BORDER_PROPERTY)
  const rounded = hasRoundedCorners(element);
  const frameAttrs = rounded ? { ...element, mode: "Transparent", backcolor: undefined } : element;

  // Different corner radii go with the frame's other properties
  const withCorners = element.cornerRadii
    ? {
        ...element,
        properties: [
          ...(element.properties ?? []),
          { name: BOX_CORNER_RADIUS_PROPERTY, value: encodeCornerRadii(element.cornerRadii) },
        ],
      }
    : element;

  let xml = `<frame>`;
  xml += `<reportElement${generateReportElementAttrs(frameAttrs)}>`;
  xml += `${generateReportElementChildren(withCorners)}`;

  // The layout attribute belongs on the property child element of reportElement
  if (element.layout) {
    xml += `<property name="com.jaspersoft.studio.layout" value="com.jaspersoft.studio.editor.layout.${element.layout}"/>`;
  }

  xml += "</reportElement>";

  // Generate the box element
  if (rounded) {
    const padding = orUndefined(withoutLines(element.box));
    if (padding) xml += generateBoxXML(padding);
    xml += generateRoundedFrameBorderXML(element);
  } else {
    xml += generateBoxXML(element.box, element);
  }

  // Generate child elements
  if (element.elements && element.elements.length > 0) {
    element.elements.forEach((child: any) => {
      xml += generateElementXML(child);
    });
  }

  xml += `</frame>`;
  return xml;
}

// Rounded rectangle(s) carrying a frame's border and fill (see ROUNDED_BORDER_PROPERTY)
function generateRoundedFrameBorderXML(frame: any): string {
  const opaque = frame.mode === "Opaque" && frame.backcolor;
  const shape = (overrides: any, marker: string, extraProperties: any[] = []) =>
    generateRectangleXML({
      type: "rectangle",
      uuid: generateUUID(),
      x: 0,
      y: 0,
      width: frame.width,
      height: frame.height,
      radius: frame.radius,
      // Grows with the frame when its content stretches
      stretchType: "RelativeToBandHeight",
      mode: "Transparent",
      pen: { lineWidth: 0 },
      properties: [{ name: ROUNDED_BORDER_PROPERTY, value: marker }, ...extraProperties],
      ...overrides,
    });

  const layered = getLayeredBorder(frame);
  if (!layered) {
    return shape(
      {
        mode: opaque ? "Opaque" : "Transparent",
        backcolor: opaque ? frame.backcolor : undefined,
        pen: getRoundedBorderPen(frame.box) ?? { lineWidth: 0 },
      },
      ROUNDED_MARKER.outline,
    );
  }

  // Positions are whole points in JRXML; a drawn side is at least 1pt wide
  const inset = (side: keyof typeof layered.widths) =>
    layered.widths[side] > 0 ? Math.max(1, Math.round(layered.widths[side])) : 0;
  const left = inset("left");
  const top = inset("top");
  const back = shape(
    { mode: "Opaque", backcolor: layered.color },
    ROUNDED_MARKER.layeredBack,
    [{ name: ROUNDED_BORDER_PENS_PROPERTY, value: encodeSidePens(frame.box) }],
  );
  const front = shape(
    {
      x: left,
      y: top,
      width: Math.max(1, frame.width - left - inset("right")),
      height: Math.max(1, frame.height - top - inset("bottom")),
      mode: "Opaque",
      backcolor: opaque ? frame.backcolor : PAPER_COLOR,
    },
    opaque ? ROUNDED_MARKER.layeredFrontFill : ROUNDED_MARKER.layeredFrontPlain,
  );
  return back + front;
}

// Generate chart XML
function generateChartXML(element: any): string {
  const chartType = element.chartType || "pie";
  const chartTagMap: Record<string, string> = {
    pie: "pieChart",
    pie3D: "pie3DChart",
    bar: "barChart",
    bar3D: "bar3DChart",
    xyBar: "xyBarChart",
    stackedBar: "stackedBarChart",
    stackedBar3D: "stackedBar3DChart",
    line: "lineChart",
    xyLine: "xyLineChart",
    area: "areaChart",
    xyArea: "xyAreaChart",
    stackedArea: "stackedAreaChart",
    scatter: "scatterChart",
    bubble: "bubbleChart",
    timeSeries: "timeSeriesChart",
    highLow: "highLowChart",
    candlestick: "candlestickChart",
    meter: "meterChart",
    thermometer: "thermometerChart",
    multiAxis: "multiAxisChart",
    gantt: "ganttChart",
    spider: "spiderChart",
  };
  const chartTag = chartTagMap[chartType] || "pieChart";

  let xml = `<${chartTag}>`;

  // The <chart> element
  xml += `<chart`;
  if (element.evaluationTime && element.evaluationTime !== "Now") {
    xml += ` evaluationTime="${xmlAttr(element.evaluationTime)}"`;
  }
  if (element.evaluationGroup) {
    xml += ` evaluationGroup="${xmlAttr(element.evaluationGroup)}"`;
  }
  if (element.renderType) {
    xml += ` renderType="${xmlAttr(element.renderType)}"`;
  }
  if (element.customizerClass) {
    xml += ` customizerClass="${xmlAttr(element.customizerClass)}"`;
  }
  xml += `>`;

  // reportElement
  xml += `<reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;
  xml += "</reportElement>";

  // chartTitle
  if (
    element.isShowTitle !== false &&
    (element.titleExpression || element.title)
  ) {
    xml += `<chartTitle>`;
    if (element.titleExpression) {
      xml += `<titleExpression>${cdata(element.titleExpression)}</titleExpression>`;
    } else if (element.title) {
      xml += `<titleExpression>${cdata(`"${String(element.title).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)}</titleExpression>`;
    }
    xml += `</chartTitle>`;
  }

  // chartSubtitle
  if (element.isShowSubtitle !== false && element.subtitleExpression) {
    xml += `<chartSubtitle>`;
    xml += `<subtitleExpression>${cdata(element.subtitleExpression)}</subtitleExpression>`;
    xml += `</chartSubtitle>`;
  }

  // chartLegend
  if (element.isShowLegend !== false) {
    xml += `<chartLegend`;
    if (element.legendExpression) {
      xml += `><labelExpression>${cdata(element.legendExpression)}</labelExpression></chartLegend>`;
    } else {
      xml += `/>`;
    }
  }

  // hyperlinkTooltipExpression
  if (element.hyperlinkTooltipExpression) {
    xml += `<hyperlinkTooltipExpression>${cdata(element.hyperlinkTooltipExpression)}</hyperlinkTooltipExpression>`;
  }

  // hyperlinkReferenceExpression
  if (element.hyperlinkExpression && element.hyperlinkType) {
    xml += `<hyperlinkReferenceExpression target="${xmlAttr(element.hyperlinkTarget || "Self")}" type="${xmlAttr(element.hyperlinkType)}"`;
    if (element.bookmarkLevel) {
      xml += ` bookmarkLevel="${xmlAttr(element.bookmarkLevel)}"`;
    }
    xml += `>${cdata(element.hyperlinkExpression)}</hyperlinkReferenceExpression>`;
  } else if (element.bookmarkLevel) {
    xml += `<hyperlinkReferenceExpression bookmarkLevel="${xmlAttr(element.bookmarkLevel)}"/>`;
  }

  xml += `</chart>`;

  // Dataset
  const datasetTag = getDatasetTag(chartType);
  const datasetItemTag = getDatasetItemTag(chartType);

  xml += `<${datasetTag}>`;
  xml += `<dataset`;
  if (element.incrementType && element.incrementType !== "None") {
    xml += ` incrementType="${xmlAttr(element.incrementType)}"`;
    if (element.incrementType === "Group" && element.incrementGroup) {
      xml += ` incrementGroup="${xmlAttr(element.incrementGroup)}"`;
    }
  }
  xml += `>`;
  if (element.subDataset) {
    xml += `<datasetRun subDataset="${xmlAttr(element.subDataset)}"`;
    if (element.uuid) {
      xml += ` uuid="${xmlAttr(element.uuid)}"`;
    }
    xml += `>`;
    if (element.dataSourceExpression) {
      xml += `<dataSourceExpression>${cdata(element.dataSourceExpression)}</dataSourceExpression>`;
    }
    xml += `</datasetRun>`;
  }
  xml += `</dataset>`;

  // Series expressions
  xml += generateDatasetSeries(chartType, element);

  xml += `</${datasetTag}>`;

  // Plot
  xml += generatePlot(chartType, element);

  xml += `</${chartTag}>`;
  return xml;
}

// Get the dataset tag
function getDatasetTag(chartType: string): string {
  const map: Record<string, string> = {
    pie: "pieDataset",
    pie3D: "pieDataset",
    bar: "categoryDataset",
    bar3D: "categoryDataset",
    stackedBar: "categoryDataset",
    stackedBar3D: "categoryDataset",
    line: "categoryDataset",
    area: "categoryDataset",
    stackedArea: "categoryDataset",
    xyBar: "xyDataset",
    xyLine: "xyDataset",
    xyArea: "xyDataset",
    scatter: "xyDataset",
    bubble: "xyDataset",
    timeSeries: "xyDataset",
    highLow: "highLowDataset",
    candlestick: "highLowDataset",
    meter: "categoryDataset",
    thermometer: "categoryDataset",
  };
  return map[chartType] || "categoryDataset";
}

// Get the data series tag
function getDatasetItemTag(chartType: string): string {
  const map: Record<string, string> = {
    pie: "keyExpression",
    pie3D: "keyExpression",
    bar: "categorySeries",
    bar3D: "categorySeries",
    stackedBar: "categorySeries",
    stackedBar3D: "categorySeries",
    line: "categorySeries",
    area: "categorySeries",
    stackedArea: "categorySeries",
    meter: "categorySeries",
    thermometer: "categorySeries",
  };
  return map[chartType] || "categorySeries";
}

// Generate the series expressions
function generateDatasetSeries(chartType: string, element: any): string {
  let xml = "";

  if (["pie", "pie3D"].includes(chartType)) {
    // Pie chart: keyExpression + valueExpression
    if (element.keyExpression) {
      xml += `<keyExpression>${cdata(element.keyExpression)}</keyExpression>`;
    }
    if (element.valueExpression) {
      xml += `<valueExpression>${cdata(element.valueExpression)}</valueExpression>`;
    }
  } else if (
    [
      "scatter",
      "bubble",
      "xyLine",
      "xyArea",
      "xyBar",
      "timeSeries",
      "highLow",
      "candlestick",
    ].includes(chartType)
  ) {
    // XY chart: xySeries
    xml += `<xySeries>`;
    if (element.seriesExpression) {
      xml += `<seriesExpression>${cdata(element.seriesExpression)}</seriesExpression>`;
    }
    if (element.xValueExpression) {
      xml += `<xValueExpression>${cdata(element.xValueExpression)}</xValueExpression>`;
    }
    if (element.yValueExpression) {
      xml += `<yValueExpression>${cdata(element.yValueExpression)}</yValueExpression>`;
    }
    xml += `</xySeries>`;
  } else {
    // Category chart: categorySeries
    xml += `<categorySeries>`;
    if (element.seriesExpression) {
      xml += `<seriesExpression>${cdata(element.seriesExpression)}</seriesExpression>`;
    }
    if (element.categoryExpression) {
      xml += `<categoryExpression>${cdata(element.categoryExpression)}</categoryExpression>`;
    }
    if (element.valueExpression) {
      xml += `<valueExpression>${cdata(element.valueExpression)}</valueExpression>`;
    }
    xml += `</categorySeries>`;
  }

  return xml;
}

// Generate Plot
function generatePlot(chartType: string, element: any): string {
  const plotTagMap: Record<string, string> = {
    pie: "piePlot",
    pie3D: "pie3DPlot",
    bar: "barPlot",
    bar3D: "bar3DPlot",
    stackedBar: "barPlot",
    stackedBar3D: "bar3DPlot",
    line: "linePlot",
    xyLine: "linePlot",
    area: "areaPlot",
    xyArea: "areaPlot",
    stackedArea: "areaPlot",
    scatter: "scatterPlot",
    bubble: "bubblePlot",
    timeSeries: "linePlot",
    highLow: "highLowPlot",
    candlestick: "highLowPlot",
    meter: "meterPlot",
    thermometer: "thermometerPlot",
  };
  const plotTag = plotTagMap[chartType] || "plot";

  let xml = `<${plotTag}`;

  // Pie-chart-specific attributes
  if (["pie", "pie3D"].includes(chartType)) {
    if (element.isCircular !== undefined) {
      xml += ` isCircular="${xmlAttr(element.isCircular)}"`;
    }
  }

  // Line-chart-specific attributes
  if (["line", "xyLine", "timeSeries"].includes(chartType)) {
    if (element.isShowShapes !== undefined) {
      xml += ` isShowShapes="${xmlAttr(element.isShowShapes)}"`;
    }
  }

  xml += `>`;

  // The plot child element
  xml += `<plot/>`;

  // itemLabel (category charts and pie charts)
  if (
    ![
      "scatter",
      "bubble",
      "highLow",
      "candlestick",
      "meter",
      "thermometer",
    ].includes(chartType)
  ) {
    const itemLabelColor = element.itemLabelColor || "#000000";
    const itemLabelBg = element.itemLabelBackgroundColor || "#FFFFFF";
    xml += `<itemLabel color="${xmlAttr(itemLabelColor)}" backgroundColor="${xmlAttr(itemLabelBg)}"/>`;
  }

  // Category axis label (category charts)
  if (
    [
      "bar",
      "bar3D",
      "stackedBar",
      "stackedBar3D",
      "line",
      "area",
      "stackedArea",
      "meter",
      "thermometer",
    ].includes(chartType)
  ) {
    if (element.categoryAxisLabelExpression) {
      xml += `<categoryAxisLabelExpression>${cdata(element.categoryAxisLabelExpression)}</categoryAxisLabelExpression>`;
    }
    xml += `<categoryAxisFormat><axisFormat/></categoryAxisFormat>`;
  }

  // Value axis label (category charts)
  if (
    [
      "bar",
      "bar3D",
      "stackedBar",
      "stackedBar3D",
      "line",
      "area",
      "stackedArea",
    ].includes(chartType)
  ) {
    if (element.valueAxisLabelExpression) {
      xml += `<valueAxisLabelExpression>${cdata(element.valueAxisLabelExpression)}</valueAxisLabelExpression>`;
    }
    xml += `<valueAxisFormat><axisFormat/></valueAxisFormat>`;
  }

  xml += `</${plotTag}>`;
  return xml;
}

// Generate barcode XML
function generateBarcodeXML(element: any): string {
  const barcodeType = element.barcodeType || "Code128";
  // Barcode4j elements are wrapped in componentElement
  let xml = `<componentElement>`;
  xml += `<reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;
  xml += "</reportElement>";

  let orientationAttr = "";
  if (element.rotation === "Right") orientationAttr = ' orientation="90"';
  else if (element.rotation === "UpsideDown") orientationAttr = ' orientation="180"';
  else if (element.rotation === "Left") orientationAttr = ' orientation="270"';
  else if (element.rotation === "None") orientationAttr = ' orientation="0"';

  // Barcode4j uses the components namespace
  xml += `<c:${barcodeType} xmlns:c="http://jasperreports.sourceforge.net/jasperreports/components"${orientationAttr}>`;
  if (element.codeExpression) {
    xml += `<c:codeExpression>${cdata(element.codeExpression)}</c:codeExpression>`;
  }
  xml += `</c:${barcodeType}>`;
  xml += `</componentElement>`;
  return xml;
}

// Add a fallback DOMParser definition for non-browser environments
if (typeof window === "undefined" && typeof DOMParser === "undefined") {
  // In a Node.js environment, a library such as xmldom needs to be imported
  // Provide a simple compatibility notice here
  console.warn(
    "DOMParser is not available. In Node.js environment, please use a library like xmldom.",
  );
}

export { parseJRXMLContent } from "./jrxml/parse";
