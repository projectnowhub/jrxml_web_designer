// Getting a template ready for the report server (Preview PDF, the AI's
// check_pdf): the template's project loaded, so its linked details show its
// values in the JRXML (their parameters' defaults), and details.json built
// from the design (utils/reportDetails.ts). The report server fetches the
// project's values, the tables' rows and the charts' numbers itself.

import type { Band } from "@/types";
import type { ReportProject } from "@/types/dataSource";
import type { ReportDetails } from "@/types/reportDetails";
import { fetchProject } from "@/queries/projectQueries";
import { buildReportDetails } from "./reportDetails";

// The template's project loaded (so its linked details show its values when the JRXML is written)
export async function ensureTemplateProject(projectId: string | undefined): Promise<void> {
  if (projectId) await fetchProject(projectId).catch(() => null);
}

// details.json for the template's design and project
export const templateDetails = (bands: Band[], project: ReportProject | undefined): ReportDetails =>
  buildReportDetails(bands, project);
