import apiClient, { ApiError } from "./apiClient";
import { PDF_PREVIEW_API } from "@/config/apiConfig";

const GENERATE_PDF_PATH = "api/pdf/generateForm";

export interface GeneratePdfPayload {
  jrxml: string;
  parameters: Record<string, unknown>;
  dataSource: Record<string, unknown>[];
  subDataSources?: Record<string, Record<string, unknown>[]>;
}

export class ReportGenerationError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "ReportGenerationError";
    this.status = status;
    this.code = code;
  }
}

const PDF_MAGIC = "%PDF";

const isPdfBytes = (bytes: Uint8Array): boolean =>
  bytes.length >= 4 &&
  String.fromCharCode(...bytes.subarray(0, 4)) === PDF_MAGIC;

const base64ToBytes = (base64: string): Uint8Array<ArrayBuffer> => {
  const clean = base64.replace(/^data:[^,]*,/, "").replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};


const extractPdfFromJson = (json: unknown): Uint8Array<ArrayBuffer> | null => {
  if (!json || typeof json !== "object") return null;
  const record = json as Record<string, unknown>;
  for (const key of ["data", "pdf", "content", "file", "bytes"]) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      try {
        const bytes = base64ToBytes(value);
        if (isPdfBytes(bytes)) return bytes;
      } catch {
        // Not base64, keep looking.
      }
    }
    if (Array.isArray(value) && value.length > 0) {
      const bytes = Uint8Array.from(value as number[], (n) => n & 0xff);
      if (isPdfBytes(bytes)) return bytes;
    }
  }
  return null;
};

// Error Message Reader: Tries to read a meaningful error message from the server response, falling back to a generic message if not possible.
const readErrorMessage = async (error: ApiError): Promise<{ message: string; code?: string }> => {
  const fallback = `PDF generation failed (HTTP ${error.status ?? "?"})`;
  const response = error.response;
  if (!response) return { message: error.message || fallback };

  try {
    const text = await response.text();
    try {
      const body = JSON.parse(text) as Record<string, unknown>;
      const message = body.detail ?? body.message ?? body.error ?? body.title;
      return {
        message: typeof message === "string" && message ? message : fallback,
        code: typeof body.code === "string" ? body.code : undefined,
      };
    } catch {
      return { message: text || fallback };
    }
  } catch {
    return { message: fallback };
  }
};

export async function generatePdf(
  payload: GeneratePdfPayload,
  signal?: AbortSignal,
): Promise<Blob> {
  const form = new FormData();
  form.append("jrxml", payload.jrxml);
  form.append("parameters", JSON.stringify(payload.parameters));
  form.append("dataSource", JSON.stringify(payload.dataSource));
  if (payload.subDataSources && Object.keys(payload.subDataSources).length > 0) {
    form.append("subDataSources", JSON.stringify(payload.subDataSources));
  }

  let blob: Blob;
  try {
    blob = await apiClient.post<Blob>(GENERATE_PDF_PATH, form, {
      baseURL: PDF_PREVIEW_API,
      responseType: "blob",
      signal,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      const { message, code } = await readErrorMessage(error);
      throw new ReportGenerationError(message, error.status, code);
    }
    throw error;
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (isPdfBytes(bytes)) {
    return new Blob([bytes], { type: "application/pdf" });
  }

  if (blob.type.includes("json")) {
    let json: unknown;
    try {
      json = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new ReportGenerationError("Server returned invalid JSON instead of a PDF");
    }
    const pdf = extractPdfFromJson(json);
    if (pdf) return new Blob([pdf], { type: "application/pdf" });

    const body = json as Record<string, unknown>;
    const message = body?.detail ?? body?.message ?? body?.error;
    throw new ReportGenerationError(
      typeof message === "string" ? message : "Server response did not contain a PDF",
    );
  }

  throw new ReportGenerationError(
    `Server response is not a PDF (content-type: ${blob.type || "unknown"})`,
  );
}
