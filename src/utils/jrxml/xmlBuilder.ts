import { xmlAttr } from "./xmlEscape";
import type { ReportProperties } from './types';

export function buildJasperReportOpenTag(properties: ReportProperties): string {
  const safeProperties = {
    ...properties,
    leftMargin: properties.leftMargin || 0,
    rightMargin: properties.rightMargin || 0,
    topMargin: properties.topMargin || 0,
    bottomMargin: properties.bottomMargin || 0
  };

  let attrs = `    name="${xmlAttr(safeProperties.name)}"
    pageWidth="${xmlAttr(safeProperties.pageWidth)}"
    pageHeight="${xmlAttr(safeProperties.pageHeight)}"
    columnWidth="${xmlAttr(safeProperties.pageWidth - safeProperties.leftMargin - safeProperties.rightMargin)}"
    leftMargin="${xmlAttr(safeProperties.leftMargin)}"
    rightMargin="${xmlAttr(safeProperties.rightMargin)}"
    topMargin="${xmlAttr(safeProperties.topMargin)}"
    bottomMargin="${xmlAttr(safeProperties.bottomMargin)}"`;

  // Add optional attributes (if not the default value)
  if (safeProperties.language && safeProperties.language !== "java") {
    attrs += `\n    language="${xmlAttr(safeProperties.language)}"`;
  }
  if (safeProperties.columnCount && safeProperties.columnCount !== 1) {
    attrs += `\n    columnCount="${xmlAttr(safeProperties.columnCount)}"`;
  }
  if (safeProperties.printOrder && safeProperties.printOrder !== "Vertical") {
    attrs += `\n    printOrder="${xmlAttr(safeProperties.printOrder)}"`;
  }
  if (safeProperties.columnDirection && safeProperties.columnDirection !== "LTR") {
    attrs += `\n    columnDirection="${xmlAttr(safeProperties.columnDirection)}"`;
  }
  if (safeProperties.orientation && safeProperties.orientation !== "Portrait") {
    attrs += `\n    orientation="${xmlAttr(safeProperties.orientation)}"`;
  }
  if (safeProperties.whenNoDataType && safeProperties.whenNoDataType !== "AllSectionsNoDetail") {
    attrs += `\n    whenNoDataType="${xmlAttr(safeProperties.whenNoDataType)}"`;
  }
  if (safeProperties.sectionType && safeProperties.sectionType !== "Band") {
    attrs += `\n    sectionType="${xmlAttr(safeProperties.sectionType)}"`;
  }
  if (safeProperties.columnWidth && safeProperties.columnWidth !== 555) {
    attrs += `\n    columnWidth="${xmlAttr(safeProperties.columnWidth)}"`;
  }
  if (safeProperties.columnSpacing && safeProperties.columnSpacing !== 0) {
    attrs += `\n    columnSpacing="${xmlAttr(safeProperties.columnSpacing)}"`;
  }
  if (safeProperties.isTitleNewPage) {
    attrs += `\n    isTitleNewPage="true"`;
  }
  if (safeProperties.isSummaryNewPage) {
    attrs += `\n    isSummaryNewPage="true"`;
  }
  if (safeProperties.isSummaryWithPageHeaderAndFooter) {
    attrs += `\n    isSummaryWithPageHeaderAndFooter="true"`;
  }
  if (safeProperties.isFloatColumnFooter) {
    attrs += `\n    isFloatColumnFooter="true"`;
  }
  if (safeProperties.isIgnorePagination) {
    attrs += `\n    isIgnorePagination="true"`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
              xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
${attrs}>
`;
}

