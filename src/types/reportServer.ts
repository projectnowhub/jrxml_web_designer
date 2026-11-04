// Report server types (Preview PDF / Download, services/reportService.ts).

import type { ApiErrorBody } from "./api";
import type { DataRow } from "./dataSource";

// What Preview PDF sends: the JRXML. The report server will load the data
// itself from the template's report bands (utils/reportBands.ts), saved with
// the template, and run it as a Jmix report (docs/REPORT_ENGINE.md)
export interface GeneratePdfPayload {
  jrxml: string;
  // TEMPORARY, until the report server loads the report bands: each data
  // table's first rows by its dataset name (the server's subDataSources),
  // values left out when empty (a JSON null would print "null")
  subDataSources?: PreviewSubDataSources;
}

// A data table's rows by its dataset name (PdfGenerationController.applySubDataSources)
export type PreviewSubDataSources = Record<string, DataRow[]>;

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
