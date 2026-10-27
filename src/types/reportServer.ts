// Report server types (Preview PDF / Download, services/reportService.ts).

import type { ApiErrorBody } from "./api";

// Only the JRXML is sent. The report server gets every table's rows and
// every chart's numbers itself, from the setups in the JRXML
// (com.cdp.table.binding, com.cdp.chart.binding; see docs/REPORT_ENGINE.md)
export interface GeneratePdfPayload {
  jrxml: string;
}

// The PDF as a field of a JSON answer: base64 text or a list of bytes
export type PdfJsonField = string | number[];

// A JSON answer instead of a PDF: the PDF in one of these fields, or an error
export interface PdfJsonResponse extends Omit<ApiErrorBody, "error"> {
  data?: PdfJsonField;
  pdf?: PdfJsonField;
  content?: PdfJsonField;
  file?: PdfJsonField;
  bytes?: PdfJsonField;
  error?: string;
}

// The fields of PdfJsonResponse that may hold the PDF
export type PdfJsonFieldName = "data" | "pdf" | "content" | "file" | "bytes";
