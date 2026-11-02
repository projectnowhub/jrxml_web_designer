// Report server types (Preview PDF / Download, services/reportService.ts).

import type { ApiErrorBody } from "./api";
import type { ReportDetails } from "./reportDetails";

// What Preview PDF sends: the JRXML (the layout) and details.json (where its
// data comes from, utils/reportDetails.ts); the report server fetches the
// project's values, the tables' rows and the charts' numbers itself
export interface GeneratePdfPayload {
  jrxml: string;
  details: ReportDetails;
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
