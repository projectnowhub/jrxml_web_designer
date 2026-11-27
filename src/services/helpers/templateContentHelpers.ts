// A server template's JRXML, read from its Jmix report's templates (their
// content: a Java byte[], so base64 in the REST answer; plain XML is read as
// it is), and written back the same way for a save (base64 of its UTF-8).
// No API calls here.

import { TemplateContentProblem } from "@/enums/templateContentProblem";
import type { TenantReportJmixReport, TenantReportTemplateContent } from "@/types/reportCatalog";

const JASPER_REPORT_TAG = /<jasperReport[\s>]/;
const JASPER_REPORT_ROOT = "jasperReport";

const utf8 = new TextDecoder("utf-8");
const utf8Encoder = new TextEncoder();
// Bytes turned into characters per step (a whole JRXML at once would overflow the call stack)
const BASE64_CHUNK = 0x8000;

// A template's content as text: plain XML as it is, else base64 (UTF-8)
function templateContentText(content: string): string {
  const text = content.trim();
  if (text.startsWith("<")) return text;
  try {
    const bytes = Uint8Array.from(atob(text.replace(/\s+/g, "")), (char) => char.charCodeAt(0));
    return utf8.decode(bytes).trim();
  } catch {
    return "";
  }
}

// A JRXML as the save sends it (PUT /v2/reports/{id}/edit templateContent):
// the base64 of its UTF-8 bytes, as the server stores the template's byte[]
// ("Invalid Base64 template content" otherwise); any language's letters kept
export function toTemplateContentBase64(jrxml: string): string {
  const bytes = utf8Encoder.encode(jrxml);
  let binary = "";
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK));
  }
  return btoa(binary);
}

// Well-formed XML whose root is <jasperReport>
function isWellFormedJrxml(text: string): boolean {
  const doc = new DOMParser().parseFromString(text, "text/xml");
  return !doc.getElementsByTagName("parsererror").length && doc.documentElement?.localName === JASPER_REPORT_ROOT;
}

// The JRXML of a tenant report's Jmix report, always from its templates'
// content (the fetch plan TENANT_REPORT_FETCH_PLAN reads them): the report's
// default template first, else the first template holding a JRXML. When none
// can be opened, jrxml is "" and `problem` says why (the designer opens an
// empty layout with a warning)
export function readReportTemplatesJrxml(report: TenantReportJmixReport | undefined): TenantReportTemplateContent {
  const templates = (report?.templates ?? []).filter((template) => template.content?.trim());
  if (!templates.length) return { jrxml: "", templateName: "", problem: TemplateContentProblem.noContent };
  const defaultId = report?.defaultTemplate?.id;
  const ordered = [
    ...templates.filter((template) => template.id === defaultId),
    ...templates.filter((template) => template.id !== defaultId),
  ];
  const texts = ordered.map((template) => ({ template, text: templateContentText(template.content!) }));
  const jrxmls = texts.filter(({ text }) => JASPER_REPORT_TAG.test(text));
  if (!jrxmls.length) return { jrxml: "", templateName: "", problem: TemplateContentProblem.notJrxml };
  const good = jrxmls.find(({ text }) => isWellFormedJrxml(text));
  if (!good) return { jrxml: "", templateName: "", problem: TemplateContentProblem.badJrxml };
  return { jrxml: good.text, templateName: good.template.name || good.template.code || "" };
}
