// A template's PDF from the report server (Preview PDF, the AI's check_pdf):
// - ensureTemplateProject: the template's project loaded, so its linked
//   details show its values in the JRXML (their parameters' defaults)
// - runTemplatePdf: the template's Jmix report run on the server as it is
//   saved there (POST /rest/reports/run/{report.id} with only the
//   parameters: its project parameters, read with the template, given the
//   template's project). The designer saves the template first.

import { ApiError } from "@/services/apiClient";
import { postRunReport } from "@/services/reportCatalogService";
import { reportServerErrorText, toPreviewRunRequest } from "@/services/helpers/reportCatalogMappers";
import { fetchProject } from "@/queries/projectQueries";
import i18n from "@/i18n";
import type { TemplatePdfRun } from "@/types/reportCatalog";

const PDF_MAGIC = "%PDF";

const t = i18n.global.t;

// The server's own words for a failed call (a 401 is left as it is: the
// API client has already sent the user to the login page)
async function runError(error: unknown): Promise<unknown> {
  if (!(error instanceof ApiError) || error.status === 401) return error;
  return new Error(await reportServerErrorText(error, t("pdfPreview.errors.httpFailure", { status: error.status ?? "?" })));
}

// The template's project loaded (so its linked details show its values when the JRXML is written)
export async function ensureTemplateProject(projectId: string | undefined): Promise<void> {
  if (projectId) await fetchProject(projectId).catch(() => null);
}

// The template's PDF, made by the report server from the template as saved there
export async function runTemplatePdf(run: TemplatePdfRun): Promise<Blob> {
  const request = toPreviewRunRequest(run.parameters, run.projectId);
  if (!request) throw new Error(t("pdfPreview.errors.noProject"));
  let file: Blob;
  try {
    ({ file } = await postRunReport(run.reportId, request, "report"));
  } catch (error) {
    throw await runError(error);
  }
  const head = new TextDecoder("latin1").decode(new Uint8Array(await file.slice(0, 4).arrayBuffer()));
  if (head !== PDF_MAGIC) throw new Error(t("pdfPreview.errors.notPdf", { type: file.type || "unknown" }));
  return new Blob([file], { type: "application/pdf" });
}
