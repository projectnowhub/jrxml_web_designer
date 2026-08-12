// Import type definitions
import type { DesignElement, BandType, Band, ReportGroup } from "../types";
import type { ReportProperties, Field, Parameter } from "./jrxml/types";
import { buildJasperReportOpenTag } from "./jrxml/xmlBuilder";
import { generateUUID } from "./jrxml/uuidGenerator";


export type { ReportProperties, Field, Parameter } from "./jrxml/types";

// Default font name
const DEFAULT_FONT = "Noto Sans SC";

// Helper function: ensure a coordinate value is an integer
function toInt(value: any): number {
  return parseInt(value as string) || 0;
}

// Generate the common reportElement attributes
function generateReportElementAttrs(element: any): string {
  let attrs = ` x="${toInt(element.x)}" y="${toInt(element.y)}" width="${toInt(element.width)}" height="${toInt(element.height)}"`;
  if (element.uuid) attrs += ` uuid="${element.uuid}"`;
  if (element.key) attrs += ` key="${element.key}"`;
  if (element.style) attrs += ` style="${element.style}"`;
  if (element.mode) attrs += ` mode="${element.mode}"`;
  if (element.positionType && element.positionType !== 'FixRelativeToTop') attrs += ` positionType="${element.positionType}"`;
  if (element.stretchType && element.stretchType !== 'NoStretch') attrs += ` stretchType="${element.stretchType}"`;
  if (element.isPrintRepeatedValues === false) attrs += ` isPrintRepeatedValues="false"`;
  if (element.isRemoveLineWhenBlank) attrs += ` isRemoveLineWhenBlank="true"`;
  if (element.forecolor) attrs += ` forecolor="${element.forecolor}"`;
  if (element.backcolor) attrs += ` backcolor="${element.backcolor}"`;
  return attrs;
}

// Generate reportElement child elements (printWhenExpression, styleExpression, property, propertyExpression)
function generateReportElementChildren(element: any): string {
  let xml = '';
  if (element.printWhenExpression) {
    xml += `<printWhenExpression><![CDATA[${element.printWhenExpression}]]></printWhenExpression>`;
  }
  if (element.styleExpression) {
    xml += `<styleExpression><![CDATA[${element.styleExpression}]]></styleExpression>`;
  }
  // Generate property elements
  if (element.properties && element.properties.length > 0) {
    element.properties.forEach((prop: any) => {
      if (prop.name) {
        xml += `<property name="${prop.name}" value="${prop.value || ''}"/>`;
      }
    });
  }
  // Generate propertyExpression elements
  if (element.propertyExpressions && element.propertyExpressions.length > 0) {
    element.propertyExpressions.forEach((prop: any) => {
      if (prop.name) {
        xml += `<propertyExpression name="${prop.name}"><![CDATA[${prop.valueExpression || ''}]]></propertyExpression>`;
      }
    });
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
        jrxml += `<property name="${prop.name}" value="${prop.value}"/>`;
      }
    });
  }

  // ============================================================
  // Order 5: reportFonts (report font definitions)
  // ============================================================
  jrxml += "<!-- Report font definitions -->";
  jrxml += `<reportFont name="reportFont" fontName="${DEFAULT_FONT}"/>`;

  // ============================================================
  // Order 6: styles (style definitions)
  // ============================================================
  if (styles && styles.length > 0) {
    jrxml += "<!-- Table styles -->";
    styles.forEach((style) => {
      jrxml += generateStyleXML(style);
    });
  } else {
    // Use default styles if none were provided
    jrxml += generateDefaultTableStylesXML();
  }

  // Add parameter definitions
  if (parameters.length > 0) {
    jrxml += "<!-- Report parameter definitions -->";
    parameters.forEach((param) => {
      if (param.name && param.class) {
        jrxml += `<parameter name="${param.name}" class="${param.class}">`;
        if (param.defaultValue !== undefined) {
          jrxml += `<defaultValueExpression><![CDATA[${param.defaultValue}]]></defaultValueExpression>`;
        }
        jrxml += "</parameter>";
      }
    });
  }

  // Add the main report's query statement
  if (properties.query && properties.query.text) {
    jrxml += `<queryString language="${properties.query.language || "sql"}"><![CDATA[${properties.query.text}]]></queryString>`;
  }

  // Add sub-dataset definitions
  if (subDatasets.length > 0) {
    jrxml += "<!-- Sub-dataset definitions -->";
    subDatasets.forEach((dataset) => {
      if (dataset.name) {
        let subDatasetAttrs = `name="${dataset.name}" uuid="${dataset.uuid || generateUUID()}"`;
        if (dataset.scriptletClass) {
          subDatasetAttrs += ` scriptletClass="${dataset.scriptletClass}"`;
        }
        if (dataset.resourceBundle) {
          subDatasetAttrs += ` resourceBundle="${dataset.resourceBundle}"`;
        }
        if (dataset.whenResourceMissingType) {
          subDatasetAttrs += ` whenResourceMissingType="${dataset.whenResourceMissingType}"`;
        }
        jrxml += `<subDataset ${subDatasetAttrs}>
`;
        // Add dataset properties
        if (dataset.properties) {
          Object.entries(dataset.properties).forEach(([key, value]) => {
            jrxml += `<property name="${key}" value="${value}"/>`;
          });
        }

        // Add the query statement
        if (dataset.query && dataset.query.text) {
          jrxml += `<queryString language="${dataset.query.language || "sql"}"><![CDATA[${dataset.query.text}]]></queryString>`;
        }

        // Add field definitions
        if (dataset.fields && dataset.fields.length > 0) {
          dataset.fields.forEach((field: any) => {
            if (field.name && field.class) {
              jrxml += `<field name="${field.name}" class="${field.class}">`;

              // Add field properties
              if (field.properties) {
                Object.entries(field.properties).forEach(([key, value]) => {
                  jrxml += `<property name="${key}" value="${value}"/>`;
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
          jrxml += `<field name="${field.name}" class="${field.class}">`;
          Object.entries(field.properties).forEach(([key, value]) => {
            if (key && value) {
              jrxml += `<property name="${key}" value="${value}"/>`;
            }
          });
          jrxml += `</field>`;
        } else {
          jrxml += `<field name="${field.name}" class="${field.class}"/>`;
        }
      }
    });
  }

  // Add report variable definitions
  if (variables.length > 0) {
    jrxml += "<!-- Report variable definitions -->";
    variables.forEach((variable) => {
      if (variable.name && variable.class) {
        let attrs = `name="${variable.name}" class="${variable.class}" uuid="${generateUUID()}"`;
        if (
          variable.calculationType &&
          variable.calculationType !== "Nothing"
        ) {
          attrs += ` calculation="${variable.calculationType}"`;
        }
        // Add the incrementType attribute (if not the default value "None")
        if (variable.incrementType && variable.incrementType !== "None") {
          attrs += ` incrementType="${variable.incrementType}"`;
        }
        // Add the incrementGroup attribute (if present)
        if (variable.incrementGroup) {
          attrs += ` incrementGroup="${variable.incrementGroup}"`;
        }
        // Add the calculationGroup attribute (if present)
        if (variable.calculationGroup) {
          attrs += ` calculationGroup="${variable.calculationGroup}"`;
        }
        if (variable.resetType) {
          attrs += ` resetType="${variable.resetType}"`;
        }
        if (variable.resetGroup) {
          attrs += ` resetGroup="${variable.resetGroup}"`;
        }
        // Add the isInitialized attribute (if not the default value false)
        if (variable.isInitialized) {
          attrs += ` isInitialized="true"`;
        }
        jrxml += `<variable ${attrs}>`;
        if (variable.expression) {
          jrxml += `<variableExpression><![CDATA[${variable.expression}]]></variableExpression>`;
        }
        if (variable.initialValueExpression) {
          jrxml += `<initialValueExpression><![CDATA[${variable.initialValueExpression}]]></initialValueExpression>`;
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
        let groupAttrs = `name="${group.name}" uuid="${generateUUID()}"`;
        if (group.isStartNewPage) groupAttrs += ' isStartNewPage="true"';
        // Add the isStartNewColumn attribute (if not the default value false)
        if (group.isStartNewColumn) groupAttrs += ' isStartNewColumn="true"';
        if (group.isRepeatHeader) groupAttrs += ' isRepeatHeader="true"';
        // Add the isReprintHeaderOnEachPage attribute (if not the default value false)
        if (group.isReprintHeaderOnEachPage) groupAttrs += ' isReprintHeaderOnEachPage="true"';
        if (group.isResetPageNumber) groupAttrs += ' isResetPageNumber="true"';
        // Add the isHideColumnHeader attribute (if not the default value false)
        if (group.isHideColumnHeader) groupAttrs += ' isHideColumnHeader="true"';
        // Add the isKeepTogether attribute (if not the default value false)
        if (group.isKeepTogether) groupAttrs += ' isKeepTogether="true"';
        // Add the isKeepFooterTogether attribute (if not the default value false)
        if (group.isKeepFooterTogether) groupAttrs += ' isKeepFooterTogether="true"';
        // Add the minHeightToStartNewPage attribute (if not the default value 0)
        if (group.minHeightToStartNewPage && group.minHeightToStartNewPage > 0) {
          groupAttrs += ` minHeightToStartNewPage="${group.minHeightToStartNewPage}"`;
        }
        jrxml += `<group ${groupAttrs}>`;
        if (group.expression) {
          jrxml += `<groupExpression><![CDATA[${group.expression}]]></groupExpression>`;
        }
        if (
          group.header &&
          (group.header.elements.length > 0 || group.header.height > 0)
        ) {
          jrxml += `<groupHeader>`;
          jrxml += `<band height="${group.header.height}">`;
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
          jrxml += `<band height="${group.footer.height}">`;
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

  // Add report bands
  bands.forEach((band) => {
    if (band.elements.length > 0 || band.height > 0) {
      jrxml += `<${band.type}>`;

      // Per the XSD spec, the height attribute belongs on the band element, but band does not allow a uuid attribute
      let bandAttributes = `height="${band.height}"`;

      // Prefer the non-deprecated splitType attribute; only fall back to the deprecated isSplitAllowed attribute if splitType is absent
      if (band.splitType) {
        // If splitType is already specified, use it directly
        bandAttributes += ` splitType="${band.splitType}"`;
      } else if (band.isSplitAllowed !== undefined) {
        // Only use the deprecated isSplitAllowed attribute if splitType is absent
        const splitTypeValue = band.isSplitAllowed ? "Stretch" : "Prevent";
        bandAttributes += ` splitType="${splitTypeValue}"`;
      }

      jrxml += `<band ${bandAttributes}>`;

      // Add the elements within the band, validating element positions per the band type
      band.elements.forEach((element) => {
        // Validate the position of each element using the current band type's height limit
        const validatedElement = validateElementPosition(element);
        jrxml += generateElementXML(validatedElement);
      });

      jrxml += `</band></${band.type}>`;
    }
  });

  jrxml += "</jasperReport>";
  return jrxml;
}

// Generate the default table styles XML
function generateDefaultTableStylesXML(): string {
  return `<!-- Default table styles --><style name="Table_TH" mode="Opaque" backcolor="#F0F8FF"><box><pen lineWidth="0.5" lineColor="#000000"/><topPen lineWidth="0.5" lineColor="#000000"/><leftPen lineWidth="0.5" lineColor="#000000"/><bottomPen lineWidth="0.5" lineColor="#000000"/><rightPen lineWidth="0.5" lineColor="#000000"/></box></style><style name="Table_CH" mode="Opaque" backcolor="#BFE1FF"><box><pen lineWidth="0.5" lineColor="#000000"/><topPen lineWidth="0.5" lineColor="#000000"/><leftPen lineWidth="0.5" lineColor="#000000"/><bottomPen lineWidth="0.5" lineColor="#000000"/><rightPen lineWidth="0.5" lineColor="#000000"/></box></style><style name="Table_TD" mode="Opaque" backcolor="#FFFFFF"><box><pen lineWidth="0.5" lineColor="#000000"/><topPen lineWidth="0.5" lineColor="#000000"/><leftPen lineWidth="0.5" lineColor="#000000"/><bottomPen lineWidth="0.5" lineColor="#000000"/><rightPen lineWidth="0.5" lineColor="#000000"/></box></style>`;
}

// Generate style XML
function generateStyleXML(style: any): string {
  if (!style.name) return "";

  let xml = `<style name="${style.name}"`;

  // Add the parentStyle attribute (style inheritance)
  if (style.parentStyle) {
    xml += ` parentStyle="${style.parentStyle}"`;
  }

  // Add the mode attribute
  if (style.mode) {
    xml += ` mode="${style.mode}"`;
  }

  // Add the background color attribute
  if (style.backcolor) {
    xml += ` backcolor="${style.backcolor}"`;
  }

  // Add the foreground color attribute
  if (style.forecolor) {
    xml += ` forecolor="${style.forecolor}"`;
  }

  xml += `>`;

  // Add the conditional style expression
  if (style.conditionExpression) {
    xml += `<conditionExpression><![CDATA[${style.conditionExpression}]]></conditionExpression>`;
  }

  // Add the box element
  if (style.box) {
    xml += generateBoxXML(style.box, style);
  }

  // Add the textElement element (if text alignment or vertical alignment is set)
  if (style.textAlignment || style.verticalAlignment) {
    xml += `<textElement`;
    if (style.textAlignment) {
      xml += ` textAlignment="${style.textAlignment}"`;
    }
    if (style.verticalAlignment) {
      xml += ` verticalAlignment="${style.verticalAlignment}"`;
    }
    xml += `>`;

    // Add the font element
    if (
      style.fontFamily ||
      style.fontSize ||
      style.isBold ||
      style.isItalic ||
      style.isUnderline
    ) {
      xml += `<font`;
      xml += ` fontName="${style.fontFamily || DEFAULT_FONT}"`;
      if (style.fontSize) {
        xml += ` size="${style.fontSize}"`;
      }
      if (style.isBold) {
        xml += ` isBold="true"`;
      }
      if (style.isItalic) {
        xml += ` isItalic="true"`;
      }
      if (style.isUnderline) {
        xml += ` isUnderline="true"`;
      }
      xml += `/>`;
    }

    xml += `</textElement>`;
  }

  // Add conditional styles
  if (style.conditionalStyles && style.conditionalStyles.length > 0) {
    style.conditionalStyles.forEach((cs: any) => {
      let csAttrs = "";
      if (cs.properties?.forecolor)
        csAttrs += ` forecolor="${cs.properties.forecolor}"`;
      if (cs.properties?.backcolor)
        csAttrs += ` backcolor="${cs.properties.backcolor}"`;
      if (cs.properties?.mode) csAttrs += ` mode="${cs.properties.mode}"`;
      xml += `<conditionalStyle${csAttrs}>`;
      if (cs.conditionExpression) {
        xml += `<conditionExpression><![CDATA[${cs.conditionExpression}]]></conditionExpression>`;
      }
      if (cs.properties?.box) {
        xml += generateBoxXML(cs.properties.box);
      }
      if (cs.properties?.textAlignment || cs.properties?.verticalAlignment) {
        xml += "<textElement";
        if (cs.properties.textAlignment)
          xml += ` textAlignment="${cs.properties.textAlignment}"`;
        if (cs.properties.verticalAlignment)
          xml += ` verticalAlignment="${cs.properties.verticalAlignment}"`;
        xml += ">";
        if (
          cs.properties.fontFamily ||
          cs.properties.fontSize ||
          cs.properties.isBold ||
          cs.properties.isItalic ||
          cs.properties.isUnderline
        ) {
          xml += "<font";
          xml += ` fontName="${cs.properties.fontFamily || DEFAULT_FONT}"`;
          if (cs.properties.fontSize)
            xml += ` size="${cs.properties.fontSize}"`;
          if (cs.properties.isBold) xml += ' isBold="true"';
          if (cs.properties.isItalic) xml += ' isItalic="true"';
          if (cs.properties.isUnderline) xml += ' isUnderline="true"';
          xml += "/>";
        }
        xml += "</textElement>";
      }
      xml += "</conditionalStyle>";
    });
  }

  xml += `</style>`;
  return xml;
}

// Generate element XML
function generateElementXML(element: any): string {
  switch (element.type) {
    case "empty":
      return "";
    case "staticText":
      return generateStaticTextXML(element);
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
    case "break":
      return generateBreakXML(element);
    case "frame":
      return generateFrameXML(element);
    case "table":
      return generateTableXML(element);
    case "subreport":
      return generateSubreportXML(element);
    case "list":
      return generateListXML(element);
    case "chart":
      return generateChartXML(element);
    case "barcode":
      return generateBarcodeXML(element);
    case "map":
      return generateMapXML(element);
    case "crosstab":
      return generateCrosstabXML(element);
    case "iconLabel":
      return generateIconLabelXML(element);
    case "genericElement":
      return generateGenericElementXML(element);
    case "sort":
      return generateSortXML(element);
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
    xml += ` padding="${paddingValue}"`;
  }
  if (boxData.topPadding !== undefined && boxData.topPadding !== "") {
    const topPaddingValue = boxData.topPadding === "" ? 0 : boxData.topPadding;
    xml += ` topPadding="${topPaddingValue}"`;
  }
  if (boxData.leftPadding !== undefined && boxData.leftPadding !== "") {
    const leftPaddingValue =
      boxData.leftPadding === "" ? 0 : boxData.leftPadding;
    xml += ` leftPadding="${leftPaddingValue}"`;
  }
  if (boxData.bottomPadding !== undefined && boxData.bottomPadding !== "") {
    const bottomPaddingValue =
      boxData.bottomPadding === "" ? 0 : boxData.bottomPadding;
    xml += ` bottomPadding="${bottomPaddingValue}"`;
  }
  if (boxData.rightPadding !== undefined && boxData.rightPadding !== "") {
    const rightPaddingValue =
      boxData.rightPadding === "" ? 0 : boxData.rightPadding;
    xml += ` rightPadding="${rightPaddingValue}"`;
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
      xml += ` lineWidth="${lineWidth}"`;
    }
    if (
      boxData.pen.lineStyle &&
      boxData.pen.lineStyle !== null &&
      boxData.pen.lineStyle !== ""
    )
      xml += ` lineStyle="${boxData.pen.lineStyle}"`;
    if (boxData.pen.lineColor && boxData.pen.lineColor !== null)
      xml += ` lineColor="${boxData.pen.lineColor}"`;
    xml += "/>";
  } else if (hasGlobalBorderWidth || hasGlobalBorderStyle) {
    // Fall back to the direct format (deprecated)
    xml += "<pen";
    if (
      boxData.borderWidth !== undefined &&
      boxData.borderWidth !== null &&
      boxData.borderWidth > 0
    ) {
      xml += ` lineWidth="${boxData.borderWidth}"`;
    }
    if (
      boxData.borderStyle !== undefined &&
      boxData.borderStyle !== null &&
      boxData.borderStyle !== ""
    ) {
      xml += ` lineStyle="${boxData.borderStyle}"`;
    }
    if (boxData.borderColor !== undefined && boxData.borderColor !== null) {
      xml += ` lineColor="${boxData.borderColor}"`;
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
    xml += ` lineWidth="${lineWidth}"`;
    if (
      boxData.topPen.lineStyle &&
      boxData.topPen.lineStyle !== null &&
      boxData.topPen.lineStyle !== ""
    )
      xml += ` lineStyle="${boxData.topPen.lineStyle}"`;
    if (boxData.topPen.lineColor && boxData.topPen.lineColor !== null)
      xml += ` lineColor="${boxData.topPen.lineColor}"`;
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
    xml += ` lineWidth="${lineWidth}"`;
    if (
      boxData.leftPen.lineStyle &&
      boxData.leftPen.lineStyle !== null &&
      boxData.leftPen.lineStyle !== ""
    )
      xml += ` lineStyle="${boxData.leftPen.lineStyle}"`;
    if (boxData.leftPen.lineColor && boxData.leftPen.lineColor !== null)
      xml += ` lineColor="${boxData.leftPen.lineColor}"`;
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
    xml += ` lineWidth="${lineWidth}"`;
    if (
      boxData.bottomPen.lineStyle &&
      boxData.bottomPen.lineStyle !== null &&
      boxData.bottomPen.lineStyle !== ""
    )
      xml += ` lineStyle="${boxData.bottomPen.lineStyle}"`;
    if (boxData.bottomPen.lineColor && boxData.bottomPen.lineColor !== null)
      xml += ` lineColor="${boxData.bottomPen.lineColor}"`;
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
    xml += ` lineWidth="${lineWidth}"`;
    if (
      boxData.rightPen.lineStyle &&
      boxData.rightPen.lineStyle !== null &&
      boxData.rightPen.lineStyle !== ""
    )
      xml += ` lineStyle="${boxData.rightPen.lineStyle}"`;
    if (boxData.rightPen.lineColor && boxData.rightPen.lineColor !== null)
      xml += ` lineColor="${boxData.rightPen.lineColor}"`;
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

  // Ensure the element has default values
  validatedElement.x = validatedElement.x || 0;
  validatedElement.y = validatedElement.y || 0;
  validatedElement.width = validatedElement.width || 100;
  validatedElement.height = validatedElement.height || 20;
  return validatedElement;
}

// Get the default height for a band type
function getDefaultBandHeight(bandType: string): number {
  switch (bandType) {
    case "title":
      return 50;
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
    case "summary":
      return 50;
    default:
      return 50;
  }
}

// Generate static text XML
function generateStaticTextXML(element: any): string {
  let xml = `<staticText`;
  xml += `><reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;

  // The layout attribute belongs on the property child element of reportElement
  if (element.layout) {
    xml += `<property name="com.jaspersoft.studio.layout" value="com.jaspersoft.studio.editor.layout.${element.layout}"/>`;
  }

  xml += "</reportElement>";

  // Generate the box element
  xml += generateBoxXML(element.box, element);

  // Always include textElement and font elements, to conform to the DTD structure
  let textElementAttrs = "";

  // The rotation attribute belongs on textElement, not on reportElement
  if (
    element.rotation &&
    ["None", "Left", "Right", "UpsideDown"].includes(element.rotation)
  ) {
    textElementAttrs += ` rotation="${element.rotation}"`;
  }

  // Prefer the non-deprecated markup attribute; only fall back to the deprecated isStyledText attribute if markup is absent
  if (element.markup) {
    // If markup is already specified, use it directly
    textElementAttrs += ` markup="${element.markup}"`;
  } else if (element.isStyledText !== undefined) {
    // Only use the deprecated isStyledText attribute if markup is absent
    const markupValue = element.isStyledText ? "styled" : "none";
    textElementAttrs += ` markup="${markupValue}"`;
  }

  // Only add the non-deprecated textAlignment attribute, to conform to the DTD
  if (
    element.textAlignment &&
    ["Left", "Center", "Right", "Justified"].includes(element.textAlignment)
  ) {
    textElementAttrs += ` textAlignment="${element.textAlignment}"`;
  }

  // Only add the non-deprecated verticalAlignment attribute, to conform to the DTD
  if (
    element.verticalAlignment &&
    ["Top", "Middle", "Bottom"].includes(element.verticalAlignment)
  ) {
    textElementAttrs += ` verticalAlignment="${element.verticalAlignment}"`;
  }

  xml += `<textElement${textElementAttrs}>
        <font`;

  let fontAttrs = "";
  // Add the font name attribute (defaults to Noto Sans SC)
  fontAttrs += ` fontName="${element.fontFamily || DEFAULT_FONT}"`;
  if (element.fontSize) {
    fontAttrs += ` size="${element.fontSize}"`;
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

  xml += `${fontAttrs}/></textElement>`;

  xml += `<text><![CDATA[${element.text || ""}]]></text></staticText>`;
  return xml;
}

// Generate text field XML
function generateTextFieldXML(element: any): string {
  let xml = `<textField`;

  // Add textField-specific attributes, ensuring compliance with the XSD spec
  // Prefer the non-deprecated textAdjust attribute; only fall back to the deprecated isStretchWithOverflow attribute if textAdjust is absent
  if (element.textAdjust) {
    // If textAdjust is already specified, use it directly
    xml += ` textAdjust="${element.textAdjust}"`;
  } else if (element.isStretchWithOverflow !== undefined) {
    // Only use the deprecated isStretchWithOverflow attribute if textAdjust is absent
    const textAdjustValue = element.isStretchWithOverflow
      ? "StretchHeight"
      : "CutText";
    xml += ` textAdjust="${textAdjustValue}"`;
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
    ];
    if (validEvaluationTimes.includes(element.evaluationTime)) {
      xml += ` evaluationTime="${element.evaluationTime}"`;
    }
    if (element.evaluationTime === "Group" && element.evaluationGroup) {
      xml += ` evaluationGroup="${element.evaluationGroup}"`;
    }
  }

  if (element.pattern) {
    xml += ` pattern="${element.pattern}"`;
  }

  if (element.isBlankWhenNull !== undefined) {
    xml += ` isBlankWhenNull="${element.isBlankWhenNull}"`;
  }

  // New: hyperlink attribute
  if (element.hyperlinkType && element.hyperlinkType !== "None") {
    xml += ` hyperlinkType="${element.hyperlinkType}"`;
  }

  // New: bookmark level
  if (element.bookmarkLevel !== undefined && element.bookmarkLevel > 0) {
    xml += ` bookmarkLevel="${element.bookmarkLevel}"`;
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
    textElementAttrs += ` rotation="${element.rotation}"`;
  }
  
  if (
    element.textAlignment &&
    ["Left", "Center", "Right", "Justified"].includes(element.textAlignment)
  ) {
    textElementAttrs += ` textAlignment="${element.textAlignment}"`;
  }

  if (
    element.verticalAlignment &&
    ["Top", "Middle", "Bottom"].includes(element.verticalAlignment)
  ) {
    textElementAttrs += ` verticalAlignment="${element.verticalAlignment}"`;
  }

  xml += `<textElement${textElementAttrs}>`;

  // Add the font configuration
  let fontAttrs = "";
  // Add the font name attribute (defaults to Noto Sans SC)
  fontAttrs += ` fontName="${element.fontFamily || DEFAULT_FONT}"`;
  if (element.fontSize) {
    fontAttrs += ` size="${element.fontSize}"`;
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
    xml += `<textFieldExpression><![CDATA[${expression}]]></textFieldExpression>`;
  }

  // New: pattern expression
  if (element.patternExpression) {
    xml += `<patternExpression><![CDATA[${element.patternExpression}]]></patternExpression>`;
  }

  // New: anchor name expression
  if (element.anchorNameExpression) {
    xml += `<anchorNameExpression><![CDATA[${element.anchorNameExpression}]]></anchorNameExpression>`;
  }

  // New: bookmark level expression
  if (element.bookmarkLevelExpression) {
    xml += `<bookmarkLevelExpression><![CDATA[${element.bookmarkLevelExpression}]]></bookmarkLevelExpression>`;
  }

  // New: hyperlink expression
  if (element.hyperlinkReferenceExpression) {
    xml += `<hyperlinkReferenceExpression><![CDATA[${element.hyperlinkReferenceExpression}]]></hyperlinkReferenceExpression>`;
  }

  // New: hyperlink condition expression
  if (element.hyperlinkWhenExpression) {
    xml += `<hyperlinkWhenExpression><![CDATA[${element.hyperlinkWhenExpression}]]></hyperlinkWhenExpression>`;
  }

  // New: hyperlink anchor expression
  if (element.hyperlinkAnchorExpression) {
    xml += `<hyperlinkAnchorExpression><![CDATA[${element.hyperlinkAnchorExpression}]]></hyperlinkAnchorExpression>`;
  }

  // New: hyperlink page expression
  if (element.hyperlinkPageExpression) {
    xml += `<hyperlinkPageExpression><![CDATA[${element.hyperlinkPageExpression}]]></hyperlinkPageExpression>`;
  }

  // New: hyperlink tooltip expression
  if (element.hyperlinkTooltipExpression) {
    xml += `<hyperlinkTooltipExpression><![CDATA[${element.hyperlinkTooltipExpression}]]></hyperlinkTooltipExpression>`;
  }
  if (element.patternExpression) {
    xml += `<patternExpression><![CDATA[${element.patternExpression}]]></patternExpression>`;
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
    xml += ` scaleImage="${scaleValue}"`;
  }

  // Handle horizontal alignment
  if (element.hAlign && ["Left", "Center", "Right"].includes(element.hAlign)) {
    xml += ` hAlign="${element.hAlign}"`;
  }

  // Handle vertical alignment
  if (element.vAlign && ["Top", "Middle", "Bottom"].includes(element.vAlign)) {
    xml += ` vAlign="${element.vAlign}"`;
  }

  // Rotation
  if (element.rotation && ["None", "Left", "Right", "UpsideDown"].includes(element.rotation)) {
    xml += ` rotation="${element.rotation}"`;
  }

  // New: whether to use caching
  if (element.isUsingCache !== undefined) {
    xml += ` isUsingCache="${element.isUsingCache}"`;
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
    xml += ` onErrorType="${element.onErrorType}"`;
  }

  // New: evaluation time
  if (element.evaluationTime && element.evaluationTime !== "Now") {
    const validEvaluationTimes = ["Report", "Page", "Column", "Band"];
    if (validEvaluationTimes.includes(element.evaluationTime)) {
      xml += ` evaluationTime="${element.evaluationTime}"`;
    }
  }

  // New: hyperlink type
  if (element.hyperlinkType && element.hyperlinkType !== "None") {
    xml += ` hyperlinkType="${element.hyperlinkType}"`;
  }

  // New: bookmark level
  if (element.bookmarkLevel !== undefined && element.bookmarkLevel > 0) {
    xml += ` bookmarkLevel="${element.bookmarkLevel}"`;
  }

  xml += `>
      <reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;
  xml += "</reportElement>";

  // Generate the box element
  xml += generateBoxXML(element.box, element);

  const imageExpressionValue = element.imageExpression || '""';
  xml += `<imageExpression><![CDATA[${imageExpressionValue}]]></imageExpression>`;

  // New: anchor name expression
  if (element.anchorNameExpression) {
    xml += `<anchorNameExpression><![CDATA[${element.anchorNameExpression}]]></anchorNameExpression>`;
  }

  // New: bookmark level expression
  if (element.bookmarkLevelExpression) {
    xml += `<bookmarkLevelExpression><![CDATA[${element.bookmarkLevelExpression}]]></bookmarkLevelExpression>`;
  }

  // New: hyperlink expression
  if (element.hyperlinkReferenceExpression) {
    xml += `<hyperlinkReferenceExpression><![CDATA[${element.hyperlinkReferenceExpression}]]></hyperlinkReferenceExpression>`;
  }

  // New: hyperlink condition expression
  if (element.hyperlinkWhenExpression) {
    xml += `<hyperlinkWhenExpression><![CDATA[${element.hyperlinkWhenExpression}]]></hyperlinkWhenExpression>`;
  }

  // New: hyperlink anchor expression
  if (element.hyperlinkAnchorExpression) {
    xml += `<hyperlinkAnchorExpression><![CDATA[${element.hyperlinkAnchorExpression}]]></hyperlinkAnchorExpression>`;
  }

  // New: hyperlink page expression
  if (element.hyperlinkPageExpression) {
    xml += `<hyperlinkPageExpression><![CDATA[${element.hyperlinkPageExpression}]]></hyperlinkPageExpression>`;
  }

  // New: hyperlink tooltip expression
  if (element.hyperlinkTooltipExpression) {
    xml += `<hyperlinkTooltipExpression><![CDATA[${element.hyperlinkTooltipExpression}]]></hyperlinkTooltipExpression>`;
  }

  xml += `</image>`;
  return xml;
}

// Generate line XML
function generateLineXML(element: any): string {
  // Handle the deprecated direction attribute, converting it to the direction attribute
  const direction = element.lineDirection || element.direction || "TopDown"; // Defaults to TopDown per the XSD
  let xml = `<line direction="${direction}">`;
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
      xml += ` fill="${element.fill}"`;
    }
    xml += ">";

    // Prefer graphicElement's pen; otherwise build the pen from the element's direct attributes
    if (hasPen) {
      xml += "<pen";
      if (element.pen.lineWidth !== undefined)
        xml += ` lineWidth="${element.pen.lineWidth}"`;
      if (element.pen.lineStyle) xml += ` lineStyle="${element.pen.lineStyle}"`;
      if (element.pen.lineColor) xml += ` lineColor="${element.pen.lineColor}"`;
      xml += "/>";
    } else if (hasLineWidth || hasLineColor || hasLineStyle) {
      xml += "<pen";
      if (hasLineWidth) xml += ` lineWidth="${element.lineWidth}"`;
      if (hasLineStyle) xml += ` lineStyle="${element.lineStyle}"`;
      if (hasLineColor) xml += ` lineColor="${element.lineColor}"`;
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
    xml += ` radius="${element.radius}"`;
  }

  xml += `><reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;
  xml += "</reportElement>";

  // Generate graphicElement
  let hasGraphicElement = false;
  let graphicElementXml = "<graphicElement";

  if (element.fill) {
    graphicElementXml += ` fill="${element.fill}"`;
    hasGraphicElement = true;
  }

  graphicElementXml += ">";

  // Generate pen
  if (
    element.pen &&
    (element.pen.lineWidth !== undefined ||
      element.pen.lineStyle ||
      element.pen.lineColor)
  ) {
    hasGraphicElement = true;
    graphicElementXml += "<pen";
    if (element.pen.lineWidth !== undefined)
      graphicElementXml += ` lineWidth="${element.pen.lineWidth}"`;
    if (element.pen.lineStyle)
      graphicElementXml += ` lineStyle="${element.pen.lineStyle}"`;
    if (element.pen.lineColor)
      graphicElementXml += ` lineColor="${element.pen.lineColor}"`;
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
    graphicElementXml += ` fill="${element.fill}"`;
    hasGraphicElement = true;
  }

  graphicElementXml += ">";

  // Generate pen
  if (
    element.pen &&
    (element.pen.lineWidth !== undefined ||
      element.pen.lineStyle ||
      element.pen.lineColor)
  ) {
    hasGraphicElement = true;
    graphicElementXml += "<pen";
    if (element.pen.lineWidth !== undefined)
      graphicElementXml += ` lineWidth="${element.pen.lineWidth}"`;
    if (element.pen.lineStyle)
      graphicElementXml += ` lineStyle="${element.pen.lineStyle}"`;
    if (element.pen.lineColor)
      graphicElementXml += ` lineColor="${element.pen.lineColor}"`;
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
  let xml = `<frame>`;
  xml += `<reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;

  // The layout attribute belongs on the property child element of reportElement
  if (element.layout) {
    xml += `<property name="com.jaspersoft.studio.layout" value="com.jaspersoft.studio.editor.layout.${element.layout}"/>`;
  }

  xml += "</reportElement>";

  // Generate the box element
  xml += generateBoxXML(element.box, element);

  // Generate child elements
  if (element.elements && element.elements.length > 0) {
    element.elements.forEach((child: any) => {
      xml += generateElementXML(child);
    });
  }

  xml += `</frame>`;
  return xml;
}

// Generate page break XML
function generateBreakXML(element: any): string {
  // Defaults to the Page type
  const type = element.breakType || "Page";
  let xml = `<break type="${type}">`;
  xml += `<reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;
  xml += "</reportElement>";
  xml += "</break>";
  return xml;
}

// Generate subreport XML
function generateSubreportXML(element: any): string {
  let xml = `<subreport`;

  // Subreport-specific attributes
  if (element.isUsingCache !== undefined) {
    xml += ` isUsingCache="${element.isUsingCache}"`;
  }
  if (element.runToBottom) {
    xml += ` runToBottom="true"`;
  }
  
  xml += `>`;
  xml += `<reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;
  xml += "</reportElement>";

  // Generate parametersMapExpression
  if (element.parametersMapExpression) {
    xml += `<parametersMapExpression><![CDATA[${element.parametersMapExpression}]]></parametersMapExpression>`;
  }

  // Generate connectionExpression or dataSourceExpression
  if (element.connectionExpression) {
    xml += `<connectionExpression><![CDATA[${element.connectionExpression}]]></connectionExpression>`;
  } else if (element.dataSourceExpression) {
    xml += `<dataSourceExpression><![CDATA[${element.dataSourceExpression}]]></dataSourceExpression>`;
  }

  // Generate subreportExpression
  if (element.subreportExpression) {
    xml += `<subreportExpression><![CDATA[${element.subreportExpression}]]></subreportExpression>`;
  }

  xml += `</subreport>`;
  return xml;
}

// Generate list XML
function generateListXML(element: any): string {
  let xml = `<list`;

  // Generate the printOrder attribute
  if (element.printOrder && element.printOrder !== 'Vertical') {
    xml += ` printOrder="${element.printOrder}"`;
  }

  // Generate the ignoreWidth attribute
  if (element.ignoreWidth !== undefined) {
    xml += ` ignoreWidth="${element.ignoreWidth}"`;
  }

  xml += `>`;
  xml += `<reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;
  xml += "</reportElement>";

  // Generate datasetRun (dataset run configuration)
  if (element.subDataset || element.dataSourceExpression || element.connectionExpression) {
    xml += `<datasetRun`;
    if (element.subDataset) {
      xml += ` subDataset="${element.subDataset}"`;
    }
    if (element.uuid) {
      xml += ` uuid="${element.uuid}"`;
    }
    xml += `>`;
    
    if (element.connectionExpression) {
      xml += `<connectionExpression><![CDATA[${element.connectionExpression}]]></connectionExpression>`;
    }
    if (element.dataSourceExpression) {
      xml += `<dataSourceExpression><![CDATA[${element.dataSourceExpression}]]></dataSourceExpression>`;
    }
    
    xml += `</datasetRun>`;
  } else if (element.dataSourceExpression) {
    // Backward compatibility with the old format: dataSourceExpression directly under the list element
    xml += `<dataSourceExpression><![CDATA[${element.dataSourceExpression}]]></dataSourceExpression>`;
  }

  // Generate the list contents
  if (element.listContents && element.listContents.elements && element.listContents.elements.length > 0) {
    const contentsHeight = element.listContents.height || element.height;
    const contentsWidth = element.listContents.width || element.width;
    xml += `<listContents height="${contentsHeight}" width="${contentsWidth}">`;
    element.listContents.elements.forEach((child: any) => {
      xml += generateElementXML(child);
    });
    xml += `</listContents>`;
  }

  xml += `</list>`;
  return xml;
}

// Generate chart XML
function generateChartXML(element: any): string {
  const chartType = element.chartType || 'pie';
  const chartTagMap: Record<string, string> = {
    pie: 'pieChart', pie3D: 'pie3DChart',
    bar: 'barChart', bar3D: 'bar3DChart', xyBar: 'xyBarChart',
    stackedBar: 'stackedBarChart', stackedBar3D: 'stackedBar3DChart',
    line: 'lineChart', xyLine: 'xyLineChart',
    area: 'areaChart', xyArea: 'xyAreaChart', stackedArea: 'stackedAreaChart',
    scatter: 'scatterChart', bubble: 'bubbleChart',
    timeSeries: 'timeSeriesChart', highLow: 'highLowChart', candlestick: 'candlestickChart',
    meter: 'meterChart', thermometer: 'thermometerChart',
    multiAxis: 'multiAxisChart', gantt: 'ganttChart', spider: 'spiderChart'
  };
  const chartTag = chartTagMap[chartType] || 'pieChart';

  let xml = `<${chartTag}>`;

  // The <chart> element
  xml += `<chart`;
  if (element.evaluationTime && element.evaluationTime !== 'Now') {
    xml += ` evaluationTime="${element.evaluationTime}"`;
  }
  if (element.evaluationGroup) {
    xml += ` evaluationGroup="${element.evaluationGroup}"`;
  }
  if (element.renderType) {
    xml += ` renderType="${element.renderType}"`;
  }
  if (element.customizerClass) {
    xml += ` customizerClass="${element.customizerClass}"`;
  }
  xml += `>`;

  // reportElement
  xml += `<reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;
  xml += "</reportElement>";

  // chartTitle
  if (element.isShowTitle !== false && (element.titleExpression || element.title)) {
    xml += `<chartTitle>`;
    if (element.titleExpression) {
      xml += `<titleExpression><![CDATA[${element.titleExpression}]]></titleExpression>`;
    } else if (element.title) {
      xml += `<titleExpression><![CDATA["${element.title}"]]></titleExpression>`;
    }
    xml += `</chartTitle>`;
  }

  // chartSubtitle
  if (element.isShowSubtitle !== false && element.subtitleExpression) {
    xml += `<chartSubtitle>`;
    xml += `<subtitleExpression><![CDATA[${element.subtitleExpression}]]></subtitleExpression>`;
    xml += `</chartSubtitle>`;
  }

  // chartLegend
  if (element.isShowLegend !== false) {
    xml += `<chartLegend`;
    if (element.legendExpression) {
      xml += `><labelExpression><![CDATA[${element.legendExpression}]]></labelExpression></chartLegend>`;
    } else {
      xml += `/>`;
    }
  }

  // hyperlinkTooltipExpression
  if (element.hyperlinkTooltipExpression) {
    xml += `<hyperlinkTooltipExpression><![CDATA[${element.hyperlinkTooltipExpression}]]></hyperlinkTooltipExpression>`;
  }

  // hyperlinkReferenceExpression
  if (element.hyperlinkExpression && element.hyperlinkType) {
    xml += `<hyperlinkReferenceExpression target="${element.hyperlinkTarget || 'Self'}" type="${element.hyperlinkType}"`;
    if (element.bookmarkLevel) {
      xml += ` bookmarkLevel="${element.bookmarkLevel}"`;
    }
    xml += `><![CDATA[${element.hyperlinkExpression}]]></hyperlinkReferenceExpression>`;
  } else if (element.bookmarkLevel) {
    xml += `<hyperlinkReferenceExpression bookmarkLevel="${element.bookmarkLevel}"/>`;
  }

  xml += `</chart>`;

  // Dataset
  const datasetTag = getDatasetTag(chartType);
  const datasetItemTag = getDatasetItemTag(chartType);

  xml += `<${datasetTag}>`;
  xml += `<dataset`;
  if (element.incrementType && element.incrementType !== 'None') {
    xml += ` incrementType="${element.incrementType}"`;
    if (element.incrementType === 'Group' && element.incrementGroup) {
      xml += ` incrementGroup="${element.incrementGroup}"`;
    }
  }
  xml += `>`;
  if (element.subDataset) {
    xml += `<datasetRun subDataset="${element.subDataset}"`;
    if (element.uuid) {
      xml += ` uuid="${element.uuid}"`;
    }
    xml += `>`;
    if (element.dataSourceExpression) {
      xml += `<dataSourceExpression><![CDATA[${element.dataSourceExpression}]]></dataSourceExpression>`;
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
    pie: 'pieDataset', pie3D: 'pieDataset',
    bar: 'categoryDataset', bar3D: 'categoryDataset',
    stackedBar: 'categoryDataset', stackedBar3D: 'categoryDataset',
    line: 'categoryDataset', area: 'categoryDataset', stackedArea: 'categoryDataset',
    xyBar: 'xyDataset', xyLine: 'xyDataset', xyArea: 'xyDataset',
    scatter: 'xyDataset', bubble: 'xyDataset', timeSeries: 'xyDataset',
    highLow: 'highLowDataset', candlestick: 'highLowDataset',
    meter: 'categoryDataset', thermometer: 'categoryDataset',
  };
  return map[chartType] || 'categoryDataset';
}

// Get the data series tag
function getDatasetItemTag(chartType: string): string {
  const map: Record<string, string> = {
    pie: 'keyExpression', pie3D: 'keyExpression',
    bar: 'categorySeries', bar3D: 'categorySeries',
    stackedBar: 'categorySeries', stackedBar3D: 'categorySeries',
    line: 'categorySeries', area: 'categorySeries', stackedArea: 'categorySeries',
    meter: 'categorySeries', thermometer: 'categorySeries',
  };
  return map[chartType] || 'categorySeries';
}

// Generate the series expressions
function generateDatasetSeries(chartType: string, element: any): string {
  let xml = '';

  if (['pie', 'pie3D'].includes(chartType)) {
    // Pie chart: keyExpression + valueExpression
    if (element.keyExpression) {
      xml += `<keyExpression><![CDATA[${element.keyExpression}]]></keyExpression>`;
    }
    if (element.valueExpression) {
      xml += `<valueExpression><![CDATA[${element.valueExpression}]]></valueExpression>`;
    }
  } else if (['scatter', 'bubble', 'xyLine', 'xyArea', 'xyBar', 'timeSeries', 'highLow', 'candlestick'].includes(chartType)) {
    // XY chart: xySeries
    xml += `<xySeries>`;
    if (element.seriesExpression) {
      xml += `<seriesExpression><![CDATA[${element.seriesExpression}]]></seriesExpression>`;
    }
    if (element.xValueExpression) {
      xml += `<xValueExpression><![CDATA[${element.xValueExpression}]]></xValueExpression>`;
    }
    if (element.yValueExpression) {
      xml += `<yValueExpression><![CDATA[${element.yValueExpression}]]></yValueExpression>`;
    }
    xml += `</xySeries>`;
  } else {
    // Category chart: categorySeries
    xml += `<categorySeries>`;
    if (element.seriesExpression) {
      xml += `<seriesExpression><![CDATA[${element.seriesExpression}]]></seriesExpression>`;
    }
    if (element.categoryExpression) {
      xml += `<categoryExpression><![CDATA[${element.categoryExpression}]]></categoryExpression>`;
    }
    if (element.valueExpression) {
      xml += `<valueExpression><![CDATA[${element.valueExpression}]]></valueExpression>`;
    }
    xml += `</categorySeries>`;
  }

  return xml;
}

// Generate Plot
function generatePlot(chartType: string, element: any): string {
  const plotTagMap: Record<string, string> = {
    pie: 'piePlot', pie3D: 'pie3DPlot',
    bar: 'barPlot', bar3D: 'bar3DPlot',
    stackedBar: 'barPlot', stackedBar3D: 'bar3DPlot',
    line: 'linePlot', xyLine: 'linePlot',
    area: 'areaPlot', xyArea: 'areaPlot', stackedArea: 'areaPlot',
    scatter: 'scatterPlot', bubble: 'bubblePlot', timeSeries: 'linePlot',
    highLow: 'highLowPlot', candlestick: 'highLowPlot',
    meter: 'meterPlot', thermometer: 'thermometerPlot',
  };
  const plotTag = plotTagMap[chartType] || 'plot';

  let xml = `<${plotTag}`;

  // Pie-chart-specific attributes
  if (['pie', 'pie3D'].includes(chartType)) {
    if (element.isCircular !== undefined) {
      xml += ` isCircular="${element.isCircular}"`;
    }
  }

  // Line-chart-specific attributes
  if (['line', 'xyLine', 'timeSeries'].includes(chartType)) {
    if (element.isShowShapes !== undefined) {
      xml += ` isShowShapes="${element.isShowShapes}"`;
    }
  }

  xml += `>`;

  // The plot child element
  xml += `<plot/>`;

  // itemLabel (category charts and pie charts)
  if (!['scatter', 'bubble', 'highLow', 'candlestick', 'meter', 'thermometer'].includes(chartType)) {
    const itemLabelColor = element.itemLabelColor || '#000000';
    const itemLabelBg = element.itemLabelBackgroundColor || '#FFFFFF';
    xml += `<itemLabel color="${itemLabelColor}" backgroundColor="${itemLabelBg}"/>`;
  }

  // Category axis label (category charts)
  if (['bar', 'bar3D', 'stackedBar', 'stackedBar3D', 'line', 'area', 'stackedArea', 'meter', 'thermometer'].includes(chartType)) {
    if (element.categoryAxisLabelExpression) {
      xml += `<categoryAxisLabelExpression><![CDATA[${element.categoryAxisLabelExpression}]]></categoryAxisLabelExpression>`;
    }
    xml += `<categoryAxisFormat><axisFormat/></categoryAxisFormat>`;
  }

  // Value axis label (category charts)
  if (['bar', 'bar3D', 'stackedBar', 'stackedBar3D', 'line', 'area', 'stackedArea'].includes(chartType)) {
    if (element.valueAxisLabelExpression) {
      xml += `<valueAxisLabelExpression><![CDATA[${element.valueAxisLabelExpression}]]></valueAxisLabelExpression>`;
    }
    xml += `<valueAxisFormat><axisFormat/></valueAxisFormat>`;
  }

  xml += `</${plotTag}>`;
  return xml;
}

// Generate barcode XML
function generateBarcodeXML(element: any): string {
  const barcodeType = element.barcodeType || 'Code128';
  // Barcode4j elements are wrapped in componentElement
  let xml = `<componentElement>`;
  xml += `<reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;
  xml += "</reportElement>";

  // Barcode4j uses the components namespace
  xml += `<c:${barcodeType} xmlns:c="http://jasperreports.sourceforge.net/jasperreports/components">`;
  if (element.codeExpression) {
    xml += `<c:codeExpression><![CDATA[${element.codeExpression}]]></c:codeExpression>`;
  }
  xml += `</c:${barcodeType}>`;
  xml += `</componentElement>`;
  return xml;
}

// Generate map XML
function generateMapXML(element: any): string {
  // Map is a componentElement type that uses the map namespace
  let xml = `<componentElement>`;
  xml += `<reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;
  xml += "</reportElement>";

  // Map uses the map namespace
  xml += `<m:map xmlns:m="http://jasperreports.sourceforge.net/jasperreports/components/map">`;
  if (element.latExpression) {
    xml += `<m:latExpression><![CDATA[${element.latExpression}]]></m:latExpression>`;
  }
  if (element.lngExpression) {
    xml += `<m:lngExpression><![CDATA[${element.lngExpression}]]></m:lngExpression>`;
  }
  if (element.zoomExpression) {
    xml += `<m:zoomExpression><![CDATA[${element.zoomExpression}]]></m:zoomExpression>`;
  }
  if (element.languageExpression) {
    xml += `<m:languageExpression><![CDATA[${element.languageExpression}]]></m:languageExpression>`;
  }
  xml += `</m:map>`;
  xml += `</componentElement>`;
  return xml;
}

// Generate crosstab XML
function generateCrosstabXML(element: any): string {
  let xml = `<crosstab>`;
  xml += `<reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;
  xml += "</reportElement>";

  // How to display when there is no data
  if (element.whenNoDataType) {
    xml += `<crosstabDataset>`;
    xml += `<datasetRun subDataset="crosstabDataset">`;
    xml += `</datasetRun>`;
    xml += `</crosstabDataset>`;
  }

  xml += `</crosstab>`;
  return xml;
}

// Generate icon label XML
function generateIconLabelXML(element: any): string {
  // IconLabel is a componentElement type
  let xml = `<componentElement>`;
  xml += `<reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;
  xml += "</reportElement>";

  // IconLabel component
  xml += `<ic:iconLabel xmlns:ic="http://jasperreports.sourceforge.net/jasperreports/components/iconlabel">`;
  if (element.icon) {
    xml += `<ic:icon><![CDATA[${element.icon}]]></ic:icon>`;
  }
  if (element.label) {
    xml += `<ic:label><![CDATA[${element.label}]]></ic:label>`;
  }
  if (element.labelExpression) {
    xml += `<ic:labelExpression><![CDATA[${element.labelExpression}]]></ic:labelExpression>`;
  }
  xml += `</ic:iconLabel>`;
  xml += `</componentElement>`;
  return xml;
}

// Generate generic element XML
function generateGenericElementXML(element: any): string {
  // GenericElement is a generic container for custom elements
  let xml = `<genericElement`;
  xml += ` x="${toInt(element.x)}" y="${toInt(element.y)}" width="${toInt(element.width)}" height="${toInt(element.height)}"`;
  if (element.uuid) {
    xml += ` uuid="${element.uuid}"`;
  }
  if (element.namespace) {
    xml += ` namespace="${element.namespace}"`;
  }
  xml += `/>`;
  return xml;
}

// Generate sort XML
function generateSortXML(element: any): string {
  // Sort is a componentElement type
  let xml = `<componentElement>`;
  xml += `<reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;
  xml += "</reportElement>";

  // Sort uses the components namespace
  xml += `<c:sort xmlns:c="http://jasperreports.sourceforge.net/jasperreports/components">`;
  if (element.sortFields && element.sortFields.length > 0) {
    element.sortFields.forEach((field: any) => {
      const order = field.order || 'Ascending';
      xml += `<c:sortField name="${field.name}" order="${order}"/>`;
    });
  }
  xml += `</c:sort>`;
  xml += `</componentElement>`;
  return xml;
}

// Generate column XML
function generateColumnXML(
  column: any,
  index: number,
  hasColumnGroups: boolean = false,
  maxDepth: number = 0,
): string {
  // Ensure the column has a uuid; generate one if missing
  const columnUuid = column.uuid || crypto.randomUUID();
  // Update the column's uuid so it gets persisted
  column.uuid = columnUuid;
  let xml = `<jr:column width="${toInt(column.width)}" uuid="${columnUuid}">
`;
  // Ensure the value attribute is properly escaped, to avoid double-quoting issues
  const escapedColumnName = (column.name || `Column${index + 1}`).replace(
    /"/g,
    "&quot;",
  );
  xml += `<property name="com.jaspersoft.studio.components.table.model.column.name" value="${escapedColumnName}"/>
`;

  // Generate tableHeader
  if (column.tableHeader && column.tableHeader.enable !== false) {
    if (column.tableHeader.element) {
      // If there's an element object, generate a tableHeader containing the element
      const tableHeaderElement = column.tableHeader.element;
      // rowSpan comes from the cell level, not the element level
      const tableHeaderRowSpan = column.tableHeader.rowSpan || 1;
      xml += `<jr:tableHeader height="${toInt(tableHeaderElement.height || 30)}" rowSpan="${tableHeaderRowSpan}" style="Table_TH">
`;
      xml += generateElementXML(tableHeaderElement).replace(
        /^    /gm,
        "                ",
      );
      xml += `</jr:tableHeader>
`;
    } else {
      // If there's no element object, generate an empty tableHeader (self-closing form)
      xml += `<jr:tableHeader height="30" rowSpan="1" style="Table_TH"/>
`;
    }
  }

  // Generate tableFooter
  if (column.tableFooter) {
    if (column.tableFooter.element) {
      // If there's an element object, generate a tableFooter containing the element
      const tableFooterElement = column.tableFooter.element;
      const tableFooterRowSpan = column.tableFooter.rowSpan || 1;
      xml += `<jr:tableFooter height="${toInt(tableFooterElement.height || 30)}" rowSpan="${tableFooterRowSpan}">
`;
      xml += generateElementXML(tableFooterElement).replace(
        /^    /gm,
        "                ",
      );
      xml += `</jr:tableFooter>
`;
    } else {
      // If there's no element object, generate an empty tableFooter (self-closing form)
      xml += `<jr:tableFooter height="30" rowSpan="1"/>
`;
    }
  }

  // Generate columnHeader
  if (!column.children) {
    if (column.columnHeader) {
      if (column.columnHeader.element) {
        // If there's an element object, generate a columnHeader containing the element
        const columnHeaderElement = column.columnHeader.element;
        // Use column.columnHeader's rowSpan; fall back to columnHeaderElement's rowSpan, defaulting to 1
        const rowSpan =
          column.columnHeader.rowSpan || columnHeaderElement.rowSpan || 1;
        // Prefer column.columnHeader.height (the column header's own height), falling back to the inner element's height
        const columnHeaderHeight = column.columnHeader.height || columnHeaderElement.height || 30;

        // Check the original column object
        console.log("Checking column object before JRXML generation:", {
          columnName: column.name,
          originalColumnHeader: column.columnHeader,
          originalElement: columnHeaderElement,
          issue: rowSpan > 1 && columnHeaderHeight !== 15 * rowSpan ? "Height anomaly" : "Normal",
        });

        console.log("Column header height details during JRXML generation:", {
          columnName: column.name,
          rowSpan,
          columnHeaderHeight,
          columnHeaderActualHeight: column.columnHeader.height,
          elementHeight: columnHeaderElement.height,
          columnHeaderElementRowSpan: columnHeaderElement.rowSpan,
          isMergedColumn: rowSpan > 1,
          expectedHeight: 15 * rowSpan, // Assuming a single row's height is 15
        });

        // Check for anomalies
        if (rowSpan > 1 && columnHeaderHeight === 60 && rowSpan === 2) {
          console.error("Anomaly detected! Height 60 should be 30 (15*2), not 60 (30*2)");
          console.error("Possible cause: height was multiplied by rowSpan twice");
        }

        xml += `<jr:columnHeader height="${toInt(columnHeaderHeight)}" rowSpan="${rowSpan}" style="Table_CH">
`;
        xml += generateElementXML(columnHeaderElement).replace(
          /^    /gm,
          "                ",
        );
        xml += `</jr:columnHeader>
`;
      } else {
        // If there's no element object, generate an empty columnHeader (self-closing form)
        // Use column.columnHeader's rowSpan, defaulting to 1
        const rowSpan = column.columnHeader.rowSpan || 1;
        // Use column.columnHeader.height, falling back to 30 if empty
        const columnHeaderHeight = column.columnHeader.height || 30;
        xml += `<jr:columnHeader height="${toInt(columnHeaderHeight)}" rowSpan="${rowSpan}" style="Table_CH"/>
`;
      }
    } else {
      // If there's no columnHeader object, generate a default columnHeader
      xml += `<jr:columnHeader height="30" rowSpan="1" style="Table_CH">
`;
      xml += `<staticText>
`;
      xml += `<reportElement x="0" y="0" width="${toInt(column.width)}" height="30"/>
`;
      xml += `<textElement textAlignment="Center" verticalAlignment="Middle">
`;
      xml += `<font fontName="${DEFAULT_FONT}"/>
`;
      xml += `</textElement>
`;
      xml += `<text><![CDATA[${column.name || `Column${index + 1}`}]]></text>
`;
      xml += `</staticText>
`;
      xml += `</jr:columnHeader>
`;
    }
  }

  // Generate columnFooter
  if (column.columnFooter) {
    if (column.columnFooter.element) {
      // If there's an element object, generate a columnFooter containing the element
      const columnFooterElement = column.columnFooter.element;
      const columnFooterRowSpan = column.columnFooter.rowSpan || 1;
      xml += `<jr:columnFooter height="${toInt(columnFooterElement.height || 30)}" rowSpan="${columnFooterRowSpan}" style="Table_CH">
`;
      xml += generateElementXML(columnFooterElement).replace(
        /^    /gm,
        "                ",
      );
      xml += `</jr:columnFooter>
`;
    } else {
      // If there's no element object, generate an empty columnFooter (self-closing form)
      xml += `<jr:columnFooter height="30" rowSpan="1" style="Table_CH"/>
`;
    }
  }

  // Generate detailCell
  if (column.detailCell) {
    if (column.detailCell.element) {
      // If there's an element object, generate a detailCell containing the element
      const detailCellElement = column.detailCell.element;
      xml += `<jr:detailCell height="${toInt(detailCellElement.height || 30)}" style="Table_TD">
`;
      xml += generateElementXML(detailCellElement).replace(
        /^    /gm,
        "                ",
      );
      xml += `</jr:detailCell>
`;
    } else {
      // If there's no element object, generate an empty detailCell (self-closing form)
      xml += `<jr:detailCell height="30" style="Table_TD"/>
`;
    }
  } else {
    // If there's no detailCell object, generate a default detailCell
    xml += `<jr:detailCell height="30" style="Table_TD">
`;
    xml += `<textField>
`;
    xml += `<reportElement x="0" y="0" width="${toInt(column.width)}" height="30"/>
`;
    xml += `<textElement textAlignment="Center" verticalAlignment="Middle">
`;
    xml += `<font fontName="${DEFAULT_FONT}"/>
`;
    xml += `</textElement>
`;
    xml += `<textFieldExpression><![CDATA[$F{FIELD_NAME}]]></textFieldExpression>
`;
    xml += `</textField>
`;
    xml += `</jr:detailCell>
`;
  }

  xml += `</jr:column>
`;
  return xml;
}

// Generate column group XML, while also collecting the UUIDs of processed columns
function generateColumnGroupXML(
  group: any,
  processedColumnUuids?: Set<string>,
  hasColumnGroups: boolean = true,
  maxDepth: number = 0,
  depth: number = 1,
): string {
  // Check whether the group has any valid child elements
  const children = group.children || [];
  const validChildren = children.filter((child: any) => {
    // Filter out child elements with zero width or that are otherwise invalid
    if (child.width <= 0 && (!child.children || child.children.length === 0)) {
      return false;
    }
    // Filter out invalid columnGroups (ones with no child elements)
    if (child.children && child.children.length === 0) {
      return false;
    }
    return true;
  });

  // If there are no valid child elements, don't generate a columnGroup
  if (validChildren.length === 0 && (!group.columnHeader || group.width <= 0)) {
    return '';
  }

  // Ensure the group has a uuid; generate one if missing
  const groupUuid = group.uuid || crypto.randomUUID();
  // Update the group's uuid so it gets persisted
  group.uuid = groupUuid;

  // Automatically compute the combined column width
  function calculateGroupWidth(node: any): number {
    if (node.children && node.children.length > 0) {
      return node.children.reduce((sum: number, child: any) => {
        return sum + calculateGroupWidth(child);
      }, 0);
    }
    return node.width || 0;
  }

  const groupWidth = calculateGroupWidth(group);
  group.width = groupWidth; // Update the group's width attribute for consistency

  let xml = `<jr:columnGroup width="${toInt(groupWidth)}" uuid="${groupUuid}">
`;
  // Ensure the value attribute is properly escaped, to avoid double-quoting issues
  const escapedGroupName = (group.name || `Group`).replace(/"/g, "&quot;");
  xml += `<property name="com.jaspersoft.studio.components.table.model.column.name" value="${escapedGroupName}"/>
`;

  // Generate tableHeader
  if (group.tableHeader && group.tableHeader.enable !== false) {
    // Resolve the tableHeader structure to get the actual element (which may live under the element property)
    const actualTableHeader = group.tableHeader.element || group.tableHeader;

    // If there's no border set, add a default border
    if (!actualTableHeader.box || !actualTableHeader.box.pen) {
      actualTableHeader.box = {
        ...actualTableHeader.box,
        pen: {
          lineWidth: 1,
          lineStyle: "Solid",
          lineColor: "#000000",
        },
      };
    }
    xml += `<jr:tableHeader height="${toInt(actualTableHeader.height || 30)}" rowSpan="${group.tableHeader.rowSpan || actualTableHeader.rowSpan || 1}" style="Table_TH">
`;
    xml += generateElementXML(actualTableHeader).replace(
      /^    /gm,
      "                ",
    );
    xml += `</jr:tableHeader>
`;
  }

  // Generate tableFooter - generate it whenever it exists, even if empty
  if (group.hasTableFooter && group.tableFooter) {
    // Resolve the tableFooter structure to get the actual element (which may live under the element property)
    const actualTableFooter = group.tableFooter.element || group.tableFooter;

    xml += `<jr:tableFooter height="${toInt(actualTableFooter.height || 30)}" rowSpan="${group.tableFooter.rowSpan || actualTableFooter.rowSpan || 1}">
`;
    if (actualTableFooter.expression || actualTableFooter.text) {
      xml += generateElementXML(actualTableFooter).replace(
        /^    /gm,
        "                ",
      );
    }
    xml += `</jr:tableFooter>
`;
  }

  // Generate columnHeader
  let columnHeader = group.columnHeader;
  if (columnHeader) {
    // Resolve the columnHeader structure to get the actual element (which may live under the element property)
    const actualColumnHeader = columnHeader.element || columnHeader;

    // Only use group.name as the default when text or expression hasn't been explicitly set
    if (actualColumnHeader.type === "staticText" && !actualColumnHeader.text) {
      actualColumnHeader.text = group.name;
    } else if (
      actualColumnHeader.type === "textField" &&
      !actualColumnHeader.expression
    ) {
      actualColumnHeader.expression = group.name;
    }
    // If there's no border set, add a default border
    if (!actualColumnHeader.box || !actualColumnHeader.box.pen) {
      actualColumnHeader.box = {
        ...actualColumnHeader.box,
        pen: {
          lineWidth: 1,
          lineStyle: "Solid",
          lineColor: "#000000",
        },
      };
    }

    // For combined columns, use the configured rowSpan value, defaulting to 1 if absent
    const rowSpan = columnHeader.rowSpan || actualColumnHeader.rowSpan || 1;
    xml += `<jr:columnHeader height="${toInt(actualColumnHeader.height || 30)}" rowSpan="${rowSpan}" style="Table_CH">
`;
    xml += generateElementXML(actualColumnHeader).replace(
      /^    /gm,
      "                ",
    );
    xml += `</jr:columnHeader>
`;
  }

  // Generate columnFooter - generate it whenever it exists, even if empty
  if (group.hasColumnFooter && group.columnFooter) {
    // Resolve the columnFooter structure to get the actual element (which may live under the element property)
    const actualColumnFooter = group.columnFooter.element || group.columnFooter;

    xml += `<jr:columnFooter height="${toInt(actualColumnFooter.height || 30)}" rowSpan="${group.columnFooter.rowSpan || actualColumnFooter.rowSpan || 1}" style="Table_CH">
`;
    if (actualColumnFooter.expression || actualColumnFooter.text) {
      xml += generateElementXML(actualColumnFooter).replace(
        /^    /gm,
        "                ",
      );
    }
    xml += `</jr:columnFooter>
`;
  }

  // Generate child groups or columns (using validChildren defined earlier)
  validChildren.forEach((child: any, index: number) => {
    if (child.children) {
      // Recursively generate the child group, passing along the hasColumnGroups flag, maxDepth, and depth
      xml += generateColumnGroupXML(
        child,
        processedColumnUuids,
        hasColumnGroups,
        maxDepth,
        depth + 1,
      );
    } else {
      // Generate a regular column, adjusting the inner column's rowSpan to match the columnGroup
      if (group.columnHeader && child.columnHeader) {
        const groupHeaderRowSpan = group.columnHeader.rowSpan || 1;

        // If the columnGroup's rowSpan is 1, the inner column's rowSpan should also be 1,
        // since the columnGroup already occupies one row
        if (groupHeaderRowSpan === 1 && child.columnHeader.rowSpan && child.columnHeader.rowSpan > 1) {
          // Reset the inner column's rowSpan to 1
          child.columnHeader.rowSpan = 1;
          // Adjust the height to a single row's height
          child.columnHeader.height = group.columnHeader.height || 30;
          if (child.columnHeader.element) {
            child.columnHeader.element.height = child.columnHeader.height;
          }
        }
      }

      xml += generateColumnXML(child, index, hasColumnGroups, maxDepth);
      if (processedColumnUuids) {
        processedColumnUuids.add(child.uuid);
      }
    }
  });

  xml += `</jr:columnGroup>`;
  return xml;
}

// Preprocess table elements, ensuring the elements within a cell match the cell's dimensions
function preprocessTableElements(element: any) {
  // Process column groups
  function processColumnGroup(group: any) {
    // First, make sure group.width reflects the freshly-computed combined width
    function calculateGroupWidth(node: any): number {
      if (node.children && node.children.length > 0) {
        return node.children.reduce((sum: number, child: any) => {
          return sum + calculateGroupWidth(child);
        }, 0);
      }
      return node.width || 0;
    }

    // Compute and update the combined column's total width
    const totalWidth = calculateGroupWidth(group);
    group.width = totalWidth; // Update the group's width attribute for consistency

    // Ensure the group's tableHeader dimensions always match the combined column's dimensions
    if (group.tableHeader) {
      group.tableHeader.width = totalWidth;
      group.tableHeader.height = group.tableHeader.height || 30;
      // Ensure the element inside tableHeader matches the tableHeader's dimensions
      if (group.tableHeader.element) {
        group.tableHeader.element.width = totalWidth;
        group.tableHeader.element.height = group.tableHeader.height;
      }
    }

    // Ensure the group's columnHeader dimensions always match the combined column's dimensions
    if (group.columnHeader) {
      group.columnHeader.width = totalWidth;
      group.columnHeader.height = group.columnHeader.height || 30;
      // Ensure the element inside columnHeader matches the columnHeader's dimensions
      if (group.columnHeader.element) {
        group.columnHeader.element.width = totalWidth;
        group.columnHeader.element.height = group.columnHeader.height;
      }
    }

    // Ensure the group's columnFooter dimensions always match the combined column's dimensions
    if (group.columnFooter) {
      group.columnFooter.width = totalWidth;
      group.columnFooter.height = group.columnFooter.height || 30;
      // Ensure the element inside columnFooter matches the columnFooter's dimensions
      if (group.columnFooter.element) {
        group.columnFooter.element.width = totalWidth;
        group.columnFooter.element.height = group.columnFooter.height;
      }
    }

    // Ensure the group's tableFooter dimensions always match the combined column's dimensions
    if (group.tableFooter) {
      group.tableFooter.width = totalWidth;
      group.tableFooter.height = group.tableFooter.height || 30;
      // Ensure the element inside tableFooter matches the tableFooter's dimensions
      if (group.tableFooter.element) {
        group.tableFooter.element.width = totalWidth;
        group.tableFooter.element.height = group.tableFooter.height;
      }
    }

    // Recursively process child groups or columns
    if (group.children) {
      // Compute the maximum group depth within the subtree (used for standalone columns' rowSpan)
      function subtreeMaxGroupDepth(node: any): number {
        if (!node.children || node.children.length === 0) return 0;
        let max = 0;
        for (const c of node.children) {
          if (c.children) {
            const d = 1 + subtreeMaxGroupDepth(c);
            if (d > max) max = d;
          }
        }
        return max;
      }
      const childMaxDepth = subtreeMaxGroupDepth(group);

      group.children.forEach((child: any) => {
        if (child.children) {
          // Child group
          processColumnGroup(child);
        } else {
          // Standalone leaf column: set the rowSpan
          const standaloneRowSpan = Math.max(1, childMaxDepth + 1);
          if (standaloneRowSpan > 1) {
            if (child.tableHeader)
              child.tableHeader.rowSpan =
                child.tableHeader.rowSpan || standaloneRowSpan;
            if (child.columnHeader)
              child.columnHeader.rowSpan =
                child.columnHeader.rowSpan || standaloneRowSpan;
            if (child.columnFooter)
              child.columnFooter.rowSpan =
                child.columnFooter.rowSpan || standaloneRowSpan;
            if (child.tableFooter)
              child.tableFooter.rowSpan =
                child.tableFooter.rowSpan || standaloneRowSpan;
          }
          // Regular column: check and adjust the cell elements within the column
          processColumn(child);
        }
      });
    }
  }

  // Process a regular column
  function processColumn(column: any) {
    const columnWidth = column.width;
    const defaultCellHeight = 30;

    // Ensure the column's tableHeader dimensions always match the column's dimensions
    if (column.tableHeader) {
      column.tableHeader.width = columnWidth;
      column.tableHeader.height =
        column.tableHeader.height || defaultCellHeight;
      // If rowSpan > 1, inflate the height to cover the merged rows
      const thRowSpan = column.tableHeader.rowSpan || 1;
      if (thRowSpan > 1) {
        const baseH =
          column.tableHeader.height === defaultCellHeight
            ? defaultCellHeight
            : Math.round(column.tableHeader.height / thRowSpan);
        column.tableHeader.height = baseH * thRowSpan;
      }
      // Ensure the element inside tableHeader matches the tableHeader's dimensions
      if (column.tableHeader.element) {
        column.tableHeader.element.width = columnWidth;
        column.tableHeader.element.height = column.tableHeader.height;
      }
    }

    // Ensure the column's columnHeader dimensions always match the column's dimensions
    if (column.columnHeader) {
      column.columnHeader.width = columnWidth;
      // Only use the default value when height isn't set; otherwise use the configured value
      if (!column.columnHeader.height) {
        column.columnHeader.height = defaultCellHeight;
      }
      // If rowSpan > 1, inflate the height to cover the merged rows (only when height is a single row's height)
      const chRowSpan = column.columnHeader.rowSpan || 1;
      if (chRowSpan > 1) {
        // Check whether the height divides evenly by rowSpan (indicating it's already the merged height)
        // If it divides evenly, it's already the correct merged height, so don't recompute
        const isAlreadyMerged = column.columnHeader.height % chRowSpan === 0;
        if (!isAlreadyMerged) {
          // Doesn't divide evenly, meaning it's still a single row's height and needs to be multiplied by rowSpan
          column.columnHeader.height = column.columnHeader.height * chRowSpan;
        }
      }
      // Ensure the element inside columnHeader matches the columnHeader's dimensions
      if (column.columnHeader.element) {
        column.columnHeader.element.width = columnWidth;
        column.columnHeader.element.height = column.columnHeader.height;
      }
    }

    // Ensure the column's detailCell dimensions always match the column's dimensions
    if (column.detailCell) {
      column.detailCell.width = columnWidth;
      column.detailCell.height = column.detailCell.height || defaultCellHeight;
      // Ensure the element inside detailCell matches the detailCell's dimensions
      if (column.detailCell.element) {
        column.detailCell.element.width = columnWidth;
        column.detailCell.element.height = column.detailCell.height;
      }
    }

    // Ensure the column's columnFooter dimensions always match the column's dimensions
    if (column.columnFooter) {
      column.columnFooter.width = columnWidth;
      // Only use the default value when height isn't set; otherwise use the configured value
      if (!column.columnFooter.height) {
        column.columnFooter.height = defaultCellHeight;
      }
      // If rowSpan > 1, inflate the height to cover the merged rows (only when height is a single row's height)
      const cfRowSpan = column.columnFooter.rowSpan || 1;
      if (cfRowSpan > 1) {
        // Check whether the height divides evenly by rowSpan (indicating it's already the merged height)
        // If it divides evenly, it's already the correct merged height, so don't recompute
        if (column.columnFooter.height % cfRowSpan !== 0) {
          // Doesn't divide evenly, meaning it's still a single row's height and needs to be multiplied by rowSpan
          column.columnFooter.height = column.columnFooter.height * cfRowSpan;
        }
        // Otherwise leave it unchanged (it's already the correct merged height)
      }
      // Ensure the element inside columnFooter matches the columnFooter's dimensions
      if (column.columnFooter.element) {
        column.columnFooter.element.width = columnWidth;
        column.columnFooter.element.height = column.columnFooter.height;
      }
    }

    // Ensure the column's tableFooter dimensions always match the column's dimensions
    if (column.tableFooter) {
      column.tableFooter.width = columnWidth;
      column.tableFooter.height =
        column.tableFooter.height || defaultCellHeight;
      // If rowSpan > 1, inflate the height to cover the merged rows
      const tfRowSpan = column.tableFooter.rowSpan || 1;
      if (tfRowSpan > 1) {
        const baseH =
          column.tableFooter.height === defaultCellHeight
            ? defaultCellHeight
            : Math.round(column.tableFooter.height / tfRowSpan);
        column.tableFooter.height = baseH * tfRowSpan;
      }
      // Ensure the element inside tableFooter matches the tableFooter's dimensions
      if (column.tableFooter.element) {
        column.tableFooter.element.width = columnWidth;
        column.tableFooter.element.height = column.tableFooter.height;
      }
    }
  }

  // Begin processing
  // Compute the rowSpan for root-level standalone columns (group depth + 1)
  function calcMaxGroupDepth(node: any): number {
    if (!node.children || node.children.length === 0) return 0;
    let max = 0;
    for (const c of node.children) {
      if (c.children) {
        const d = 1 + calcMaxGroupDepth(c);
        if (d > max) max = d;
      }
    }
    return max;
  }
  const rootMaxGroupDepth = calcMaxGroupDepth({
    children: element.children || [],
  });
  const rootStandaloneRowSpan = Math.max(1, rootMaxGroupDepth + 1);

  // Process all children (including column groups and regular columns)
  const groupChildren = element.children || [];
  groupChildren.forEach((child: any) => {
    if (child.children) {
      // Process a column group
      processColumnGroup(child);
    } else {
      // Root-level standalone column: set the rowSpan
      if (rootStandaloneRowSpan > 1) {
        if (child.tableHeader)
          child.tableHeader.rowSpan =
            child.tableHeader.rowSpan || rootStandaloneRowSpan;
        if (child.columnHeader)
          child.columnHeader.rowSpan =
            child.columnHeader.rowSpan || rootStandaloneRowSpan;
        if (child.columnFooter)
          child.columnFooter.rowSpan =
            child.columnFooter.rowSpan || rootStandaloneRowSpan;
        if (child.tableFooter)
          child.tableFooter.rowSpan =
            child.tableFooter.rowSpan || rootStandaloneRowSpan;
      }
      // Process a regular column
      processColumn(child);
    }
  });

  // If there are no regular columns among children, fall back to the columns array
  const hasPlainColumnsInChildren = groupChildren.some(
    (child: any) => !child.children,
  );
  if (!hasPlainColumnsInChildren) {
    const normalColumns = element.columns || [];
    normalColumns.forEach((child: any) => {
      if (!child.children) {
        processColumn(child);
      }
    });
  }
}

// Generate table XML
function generateTableXML(element: any): string {
  // Preprocess the table element, ensuring the width of elements inside multi-column combined cells doesn't exceed the combined column's total width
  preprocessTableElements(element);

  let xml = `<componentElement>
      <reportElement${generateReportElementAttrs(element)}>`;
  xml += `${generateReportElementChildren(element)}`;

  // Add table style attributes
  let tableStyleProps = '';
  if (element.styles) {
    if (element.styles.tableHeader) {
      tableStyleProps += `<property name="com.jaspersoft.studio.table.style.table_header" value="${element.styles.tableHeader}"/>`;
    }
    if (element.styles.columnHeader) {
      tableStyleProps += `<property name="com.jaspersoft.studio.table.style.column_header" value="${element.styles.columnHeader}"/>`;
    }
    if (element.styles.detail) {
      tableStyleProps += `<property name="com.jaspersoft.studio.table.style.detail" value="${element.styles.detail}"/>`;
    }
  }

  xml += tableStyleProps;
  xml += "</reportElement>";

  // Add table attributes - only include attributes allowed by the XSD
  let tableAttrs = "";
  if (element.whenNoDataType) {
    tableAttrs += ` whenNoDataType="${element.whenNoDataType}"`;
  }

  xml += `<jr:table xmlns:jr="http://jasperreports.sourceforge.net/jasperreports/components" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports/components http://jasperreports.sourceforge.net/xsd/components.xsd"${tableAttrs}>
`;

  // Generate datasetRun
  const dataset = element.dataset || {};
  // Use the uuid already present on the element; generate a new one if missing
  const datasetUuid = dataset.uuid || crypto.randomUUID();
  xml += `<datasetRun subDataset="${dataset.name || "tableDataset"}" uuid="${datasetUuid}">
`;
  xml += `<connectionExpression><![CDATA[${dataset.connectionExpression || "$P{REPORT_CONNECTION}"}]]></connectionExpression>
`;
  xml += `</datasetRun>
`;

  // Generate columns and column groups

  // Detect whether the table has any combined columns
  const hasColumnGroups =
    (element.children &&
      element.children.some((child: any) => child.children)) ||
    false;

  // Compute the maximum nesting depth of combined columns in the table (counting only group nodes, not leaf nodes)
  // Starting from the virtual root (depth=0); group nodes are at depth=1
  function calculateMaxGroupDepth(node: any, depth: number = 0): number {
    if (!node.children || node.children.length === 0) {
      return depth;
    }
    let maxDepth = depth;
    for (const child of node.children) {
      if (child.children && child.children.length > 0) {
        const childDepth = calculateMaxGroupDepth(child, depth + 1);
        if (childDepth > maxDepth) {
          maxDepth = childDepth;
        }
      }
    }
    return maxDepth;
  }

  // Compute the maximum depth of group nodes within a given node's children (relative to that node's depth)
  // Only considers group nodes at the same level as, or deeper than, standaloneColumn
  // Used to determine standaloneColumn's rowSpan
  function getMaxGroupDepthInChildren(
    children: any[],
    baseDepth: number,
  ): number {
    let maxDepth = baseDepth;
    for (const child of children) {
      if (child.children && child.children.length > 0) {
        // This is a group node
        const childMaxDepth = getMaxGroupDepthInChildren(
          child.children,
          baseDepth + 1,
        );
        if (childMaxDepth > maxDepth) {
          maxDepth = childMaxDepth;
        }
      }
    }
    return maxDepth;
  }

  // Compute the total number of group nodes in the table (used to determine the top-level standaloneColumn's rowSpan)
  function countGroups(node: any): number {
    if (!node.children || node.children.length === 0) {
      return 0;
    }
    let count = 0;
    for (const child of node.children) {
      if (child.children && child.children.length > 0) {
        count += 1 + countGroups(child);
      }
    }
    return count;
  }

  const maxGroupDepth = calculateMaxGroupDepth({
    children: element.children || [],
  });
  const totalGroups = countGroups({ children: element.children || [] });

  // 1. Collect the UUIDs of columns that have already been processed
  const processedColumnUuids = new Set<string>();

  // 2. Process element.children (includes column groups and direct columns)
  //    rowSpan and height have already been set in preprocessTableElements
  const children = element.children || [];
  children.forEach((child: any, index: number) => {
    if (child.children) {
      // Column group
      xml += generateColumnGroupXML(
        child,
        processedColumnUuids,
        hasColumnGroups,
        maxGroupDepth,
      );
    } else {
      // A direct column, i.e. a top-level direct column (rowSpan and height already handled by preprocessTableElements)
      xml += generateColumnXML(child, index, hasColumnGroups, maxGroupDepth);
      processedColumnUuids.add(child.uuid);
    }
  });

  // 3. Process element.columns, skipping columns already processed within children
  //    rowSpan and height have already been set in preprocessTableElements
  const normalColumns = element.columns || [];
  normalColumns.forEach((child: any, index: number) => {
    if (!child.children && !processedColumnUuids.has(child.uuid)) {
      xml += generateColumnXML(child, index, hasColumnGroups, maxGroupDepth);
      processedColumnUuids.add(child.uuid);
    }
  });

  // Generate the remaining parts of the table
  // Generate tableHeader
  if (element.tableHeader) {
    xml += `<tableHeader height="${toInt(element.tableHeader.height || 30)}">
`;
    if (element.tableHeader.printWhenExpression) {
      xml += `<printWhenExpression><![CDATA[${element.tableHeader.printWhenExpression}]]></printWhenExpression>
`;
    }
    xml += `</tableHeader>
`;
  }

  // Generate columnHeader
  if (element.columnHeader) {
    xml += `<columnHeader height="${toInt(element.columnHeader.height || 30)}">
`;
    if (element.columnHeader.printWhenExpression) {
      xml += `<printWhenExpression><![CDATA[${element.columnHeader.printWhenExpression}]]></printWhenExpression>
`;
    }
    xml += `</columnHeader>
`;
  }

  // Generate groupHeader
  if (element.groupHeaders && element.groupHeaders.length > 0) {
    element.groupHeaders.forEach((groupHeader: any) => {
      xml += `<groupHeader groupName="${groupHeader.groupName}">
`;
      xml += `<row height="${toInt(groupHeader.height || 30)}">
`;
      if (groupHeader.printWhenExpression) {
        xml += `<printWhenExpression><![CDATA[${groupHeader.printWhenExpression}]]></printWhenExpression>
`;
      }
      xml += `</row>
`;
      xml += `</groupHeader>
`;
    });
  }

  // Generate detail
  if (element.detail) {
    xml += `<detail height="${toInt(element.detail.height || 30)}">
`;
    if (element.detail.printWhenExpression) {
      xml += `<printWhenExpression><![CDATA[${element.detail.printWhenExpression}]]></printWhenExpression>
`;
    }
    xml += `</detail>
`;
  }

  // Generate groupFooter
  if (element.groupFooters && element.groupFooters.length > 0) {
    element.groupFooters.forEach((groupFooter: any) => {
      xml += `<groupFooter groupName="${groupFooter.groupName}">
`;
      xml += `<row height="${toInt(groupFooter.height || 30)}">
`;
      if (groupFooter.printWhenExpression) {
        xml += `<printWhenExpression><![CDATA[${groupFooter.printWhenExpression}]]></printWhenExpression>
`;
      }
      xml += `</row>
`;
      xml += `</groupFooter>
`;
    });
  }

  // Generate columnFooter
  if (element.columnFooter) {
    xml += `<columnFooter height="${toInt(element.columnFooter.height || 30)}">
`;
    if (element.columnFooter.printWhenExpression) {
      xml += `<printWhenExpression><![CDATA[${element.columnFooter.printWhenExpression}]]></printWhenExpression>
`;
    }
    xml += `</columnFooter>
`;
  }

  // Generate tableFooter
  if (element.tableFooter) {
    xml += `<tableFooter height="${toInt(element.tableFooter.height || 30)}">
`;
    if (element.tableFooter.printWhenExpression) {
      xml += `<printWhenExpression><![CDATA[${element.tableFooter.printWhenExpression}]]></printWhenExpression>
`;
    }
    xml += `</tableFooter>
`;
  }

  // Generate noData
  if (element.noData) {
    xml += `<noData height="${toInt(element.noData.height || 30)}"`;
    if (element.noData.style) {
      xml += ` style="${element.noData.style}"`;
    }
    xml += `>
`;
    if (element.noData.elements && element.noData.elements.length > 0) {
      element.noData.elements.forEach((noDataElement: any) => {
        xml += generateElementXML(noDataElement).replace(
          /^    /gm,
          "            ",
        );
      });
    }
    xml += `</noData>
`;
  }

  xml += `</jr:table>
    </componentElement>
`;
  return xml;
}

// A UUID generation function is no longer needed and has been removed

// Parse JRXML content into the designer data structure
function parseJRXMLContentLegacy(jrxmlContent: string): {
  properties: ReportProperties;
  bands: Band[];
  fields: Field[];
  parameters: Parameter[];
} {
  // Parse the XML using DOMParser
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(jrxmlContent, "text/xml");

  // Parse the report properties
  const jasperReportElem = xmlDoc.querySelector("jasperReport");
  if (!jasperReportElem) {
    throw new Error("Invalid JRXML: Missing jasperReport element");
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
  };

  // Parse fields
  const fields: Field[] = [];
  xmlDoc.querySelectorAll("field").forEach((fieldElem) => {
    const name = fieldElem.getAttribute("name");
    const className = fieldElem.getAttribute("class") || "java.lang.String";
    if (name) {
      fields.push({ name, class: className });
    }
  });

  // Parse parameters
  const parameters: Parameter[] = [];
  xmlDoc.querySelectorAll("parameter").forEach((paramElem) => {
    const name = paramElem.getAttribute("name");
    const className = paramElem.getAttribute("class") || "java.lang.String";
    if (name) {
      const param: Parameter = { name, class: className };

      // Parse the default value
      const defaultValueExpr = paramElem.querySelector(
        "defaultValueExpression",
      );
      if (defaultValueExpr && defaultValueExpr.textContent) {
        param.defaultValue = defaultValueExpr.textContent.trim();
      }

      parameters.push(param);
    }
  });

  // Parse bands
  const bands: Band[] = [];
  const bandTypes = [
    "background",
    "title",
    "pageHeader",
    "columnHeader",
    "detail",
    "columnFooter",
    "pageFooter",
    "lastPageFooter",
    "summary",
    "noData",
  ];

  bandTypes.forEach((type) => {
    const bandContainer = xmlDoc.querySelector(`${type}`);
    if (bandContainer) {
      const bandElem = bandContainer.querySelector("band");
      if (bandElem) {
        const height = parseInt(bandElem.getAttribute("height") || "0");
        const elements = parseBandElements(bandElem);

        const band: any = {
          type: type as BandType,
          height,
          elements,
        };

        // Prefer the non-deprecated splitType attribute; only fall back to the deprecated isSplitAllowed attribute if splitType is absent
        if (bandElem.hasAttribute("splitType")) {
          // If splitType is already specified, use it directly
          band.splitType = bandElem.getAttribute("splitType");
        } else if (bandElem.hasAttribute("isSplitAllowed")) {
          // Only use the deprecated isSplitAllowed attribute if splitType is absent
          const isSplitAllowed =
            bandElem.getAttribute("isSplitAllowed") === "true";
          band.splitType = isSplitAllowed ? "Stretch" : "Prevent";
        }

        bands.push(band);
      }
    }
  });

  return { properties, bands, fields, parameters };
}

// Parse the elements within a band
function parseBandElements(bandElem: Element): any[] {
  const elements: any[] = [];

  // Handle the various element types
  const elementTypes = [
    "staticText",
    "textField",
    "image",
    "line",
    "rectangle",
  ];

  elementTypes.forEach((type) => {
    bandElem.querySelectorAll(type).forEach((element) => {
      const parsedElement = parseElement(element, type);
      if (parsedElement) {
        elements.push(parsedElement);
      }
    });
  });

  return elements;
}

// Parse a single element
function parseElement(element: Element, type: string): any {
  const reportElement = element.querySelector("reportElement");
  if (!reportElement) return null;

  // Ensure type is a valid DesignElement type (excluding rectangle)
  const validElementTypes: Array<
    "staticText" | "textField" | "image" | "line"
  > = ["staticText", "textField", "image", "line"];
  const elementType = validElementTypes.includes(type as any)
    ? (type as any)
    : undefined;

  if (!elementType) return null;

  const result: Partial<DesignElement> = {
    type: elementType,
    x: parseInt(reportElement.getAttribute("x") || "0"),
    y: parseInt(reportElement.getAttribute("y") || "0"),
    width: parseInt(reportElement.getAttribute("width") || "100"),
    height: parseInt(reportElement.getAttribute("height") || "30"),
  };

  // Set the background color
  const backcolor = reportElement.getAttribute("backcolor");
  if (backcolor) {
    result.backcolor = backcolor;
  }

  // Parse the box element
  const boxElement = element.querySelector("box");
  if (boxElement) {
    result.box = parseBoxElement(boxElement);
  }

  // Parse type-specific element attributes
  switch (type) {
    case "staticText":
      parseStaticTextElement(element, result);
      break;
    case "textField":
      parseTextFieldElement(element, result);
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
  }

  return result;
}

// Parse the box element, focusing on borders and padding
function parseBoxElement(boxElement: Element): any {
  const box = {} as any;

  // Parse the padding attribute
  if (boxElement.hasAttribute("padding")) {
    box.padding = parseInt(boxElement.getAttribute("padding") || "0");
  }

  // Parse the per-side padding attributes
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

  // Parse the deprecated border attribute, converting it to the pen child element
  if (boxElement.hasAttribute("border")) {
    if (!box.pen) box.pen = {};
    // Ensure a border width of 0 is also recorded rather than ignored
    box.pen.lineWidth = parseInt(boxElement.getAttribute("border") || "0");
  }

  // Parse the deprecated borderColor attribute, converting it to the pen child element
  if (boxElement.hasAttribute("borderColor")) {
    if (!box.pen) box.pen = {};
    box.pen.lineColor = boxElement.getAttribute("borderColor");
  }

  // Parse the deprecated topBorder attribute, converting it to the topPen child element
  if (boxElement.hasAttribute("topBorder")) {
    if (!box.topPen) box.topPen = {};
    // Ensure a border width of 0 is also recorded rather than ignored
    box.topPen.lineWidth = parseInt(
      boxElement.getAttribute("topBorder") || "0",
    );
  }

  // Parse the deprecated topBorderColor attribute, converting it to the topPen child element
  if (boxElement.hasAttribute("topBorderColor")) {
    if (!box.topPen) box.topPen = {};
    box.topPen.lineColor = boxElement.getAttribute("topBorderColor");
  }

  // Parse the deprecated leftBorder attribute, converting it to the leftPen child element
  if (boxElement.hasAttribute("leftBorder")) {
    if (!box.leftPen) box.leftPen = {};
    // Ensure a border width of 0 is also recorded rather than ignored
    box.leftPen.lineWidth = parseInt(
      boxElement.getAttribute("leftBorder") || "0",
    );
  }

  // Parse the deprecated leftBorderColor attribute, converting it to the leftPen child element
  if (boxElement.hasAttribute("leftBorderColor")) {
    if (!box.leftPen) box.leftPen = {};
    box.leftPen.lineColor = boxElement.getAttribute("leftBorderColor");
  }

  // Parse the deprecated bottomBorder attribute, converting it to the bottomPen child element
  if (boxElement.hasAttribute("bottomBorder")) {
    if (!box.bottomPen) box.bottomPen = {};
    // Ensure a border width of 0 is also recorded rather than ignored
    box.bottomPen.lineWidth = parseInt(
      boxElement.getAttribute("bottomBorder") || "0",
    );
  }

  // Parse the deprecated bottomBorderColor attribute, converting it to the bottomPen child element
  if (boxElement.hasAttribute("bottomBorderColor")) {
    if (!box.bottomPen) box.bottomPen = {};
    box.bottomPen.lineColor = boxElement.getAttribute("bottomBorderColor");
  }

  // Parse the deprecated rightBorder attribute, converting it to the rightPen child element
  if (boxElement.hasAttribute("rightBorder")) {
    if (!box.rightPen) box.rightPen = {};
    // Ensure a border width of 0 is also recorded rather than ignored
    box.rightPen.lineWidth = parseInt(
      boxElement.getAttribute("rightBorder") || "0",
    );
  }

  // Parse the deprecated rightBorderColor attribute, converting it to the rightPen child element
  if (boxElement.hasAttribute("rightBorderColor")) {
    if (!box.rightPen) box.rightPen = {};
    box.rightPen.lineColor = boxElement.getAttribute("rightBorderColor");
  }

  // Parse the pen child elements
  const topPen = boxElement.querySelector("topPen");
  if (topPen) box.topPen = parsePenElement(topPen);

  const leftPen = boxElement.querySelector("leftPen");
  if (leftPen) box.leftPen = parsePenElement(leftPen);

  const bottomPen = boxElement.querySelector("bottomPen");
  if (bottomPen) box.bottomPen = parsePenElement(bottomPen);

  const rightPen = boxElement.querySelector("rightPen");
  if (rightPen) box.rightPen = parsePenElement(rightPen);

  const pen = boxElement.querySelector("pen");
  if (pen) box.pen = parsePenElement(pen);

  return box;
}

// Parse the pen element, handling border width, style, and color
function parsePenElement(penElement: Element): any {
  const pen = {} as any;

  if (penElement.hasAttribute("lineWidth")) {
    // Ensure a lineWidth of 0 is also recorded rather than ignored
    pen.lineWidth = parseFloat(penElement.getAttribute("lineWidth") || "0");
  }
  if (penElement.hasAttribute("lineStyle"))
    pen.lineStyle = penElement.getAttribute("lineStyle");
  if (penElement.hasAttribute("lineColor"))
    pen.lineColor = penElement.getAttribute("lineColor");

  return pen;
}

// Parse a static text element
function parseStaticTextElement(element: Element, result: any): void {
  const textElement = element.querySelector("textElement");
  if (textElement) {
    if (textElement.hasAttribute("textAlignment")) {
      result.textAlignment = textElement.getAttribute("textAlignment");
    }

    if (textElement.hasAttribute("verticalAlignment")) {
      result.verticalAlignment = textElement.getAttribute("verticalAlignment");
    }

    // Handle the deprecated isStyledText attribute, converting it to the markup attribute
    if (textElement.hasAttribute("isStyledText")) {
      const isStyledText = textElement.getAttribute("isStyledText") === "true";
      result.markup = isStyledText ? "styled" : "none";
    }

    // If markup is already specified, use it directly
    if (textElement.hasAttribute("markup")) {
      result.markup = textElement.getAttribute("markup");
    }

    const fontElement = textElement.querySelector("font");
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

  const textNode = element.querySelector("text");
  if (textNode) {
    result.text = textNode.textContent || "";
  }
}

// Parse a text field element
function parseTextFieldElement(element: Element, result: any): void {
  // Handle the deprecated isStretchWithOverflow attribute, converting it to the textAdjust attribute
  if (element.hasAttribute("isStretchWithOverflow")) {
    const isStretchWithOverflow =
      element.getAttribute("isStretchWithOverflow") === "true";
    result.textAdjust = isStretchWithOverflow ? "StretchHeight" : "CutText";
  }

  // If textAdjust is already specified, use it directly
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

  // Parse textElement and font
  const textElement = element.querySelector("textElement");
  if (textElement) {
    if (textElement.hasAttribute("textAlignment")) {
      result.textAlignment = textElement.getAttribute("textAlignment");
    }

    if (textElement.hasAttribute("verticalAlignment")) {
      result.verticalAlignment = textElement.getAttribute("verticalAlignment");
    }

    const fontElement = textElement.querySelector("font");
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

  // Parse the expression
  const expressionElem = element.querySelector("textFieldExpression");
  if (expressionElem) {
    result.expression = expressionElem.textContent || "";
    // Try to extract the field name from the expression
    const fieldMatch = result.expression.match(/\$F\{([^}]+)\}/);
    if (fieldMatch) {
      result.fieldName = fieldMatch[1];
    }
  }
}

// Parse an image element
function parseImageElement(element: Element, result: any): void {
  if (element.hasAttribute("scaleImage"))
    result.scaleImage = element.getAttribute("scaleImage");
  if (element.hasAttribute("hAlign"))
    result.hAlign = element.getAttribute("hAlign");
  if (element.hasAttribute("vAlign"))
    result.vAlign = element.getAttribute("vAlign");

  // Parse graphicElement
  const graphicElement = parseGraphicElement(element);
  if (Object.keys(graphicElement).length > 0) {
    Object.assign(result, graphicElement);
  }

  const imageExpression = element.querySelector("imageExpression");
  if (imageExpression) {
    result.imageExpression = imageExpression.textContent || "";
  }
}

// Parse a line element
function parseLineElement(element: Element, result: any): void {
  if (element.hasAttribute("direction")) {
    // Map the XML's direction attribute to lineDirection
    result.lineDirection = element.getAttribute("direction");
  }

  // Parse graphicElement
  const graphicElement = parseGraphicElement(element);
  if (Object.keys(graphicElement).length > 0) {
    Object.assign(result, graphicElement);
  }
}

// Parse graphicElement
function parseGraphicElement(element: Element): any {
  const graphicElement: any = {};

  // Parse the graphicElement attributes
  const graphicEl = element.querySelector("graphicElement");
  if (graphicEl) {
    // Handle the deprecated stretchType attribute, converting it to the same-named attribute on reportElement
    if (graphicEl.hasAttribute("stretchType")) {
      graphicElement.stretchType = graphicEl.getAttribute("stretchType");
    }

    if (graphicEl.hasAttribute("fill")) {
      graphicElement.fill = graphicEl.getAttribute("fill");
    }

    // Handle the deprecated pen attribute, converting it to the pen child element
    const penElement = graphicEl.querySelector("pen");
    if (penElement) {
      const pen: any = {};
      if (penElement.hasAttribute("lineWidth")) {
        pen.lineWidth = parseInt(penElement.getAttribute("lineWidth") || "0");
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

// Parse a rectangle element
function parseRectangleElement(element: Element, result: any): void {
  // Parse graphicElement
  const graphicElement = parseGraphicElement(element);
  if (Object.keys(graphicElement).length > 0) {
    Object.assign(result, graphicElement);
  }
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
