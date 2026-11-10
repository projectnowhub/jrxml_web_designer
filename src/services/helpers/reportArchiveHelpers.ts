// A Report Definition's report file (a Jmix Reports export) read in the
// browser: the zip's entries, then the JRXML of the report's default template.
// No API calls here.
//
// The export (io.jmix.reports ReportImportExportImpl, Jmix 3.0.2) is a zip of
// "<report name>.zip" entries (stored, names in CP866), each a zip of
// "report.structure" (the report as JSON) and "templates/<index>/<file name>".
// A zip holding report.structure itself (one report zipped by hand) is read
// too. Entries may be stored or deflated (DecompressionStream "deflate-raw").
// Failures throw an Error whose message is a REPORT_ARCHIVE_ERRORS code.

import { REPORT_ARCHIVE_ERRORS } from "@/constants/reportCatalogConstants";
import type { JmixReportStructure, ZipFileEntry } from "@/types/reportCatalog";

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
const STORED = 0;
const DEFLATED = 8;
// General purpose flag: the name is UTF-8 (else CP866, as Jmix writes it)
const UTF8_NAME_FLAG = 0x0800;
const STRUCTURE_ENTRY = "report.structure";
const TEMPLATE_ENTRY = /^templates\/(\d+)\/(.+)$/;
const JRXML_NAME = /\.jrxml$/i;

const utf8 = new TextDecoder("utf-8");
const cp866 = new TextDecoder("ibm866");

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function findEndOfCentralDirectory(view: DataView): number {
  // The record is 22 bytes plus a comment of at most 65,535
  const last = Math.max(0, view.byteLength - 22 - 0xffff);
  for (let at = view.byteLength - 22; at >= last; at--) {
    if (view.getUint32(at, true) === END_OF_CENTRAL_DIRECTORY) return at;
  }
  throw new Error(REPORT_ARCHIVE_ERRORS.notZip);
}

const isZip = (bytes: Uint8Array): boolean =>
  bytes.length >= 4 && new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, true) === LOCAL_FILE_HEADER;

// Every file in a zip (folders left out)
export async function readZipEntries(bytes: Uint8Array): Promise<ZipFileEntry[]> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = findEndOfCentralDirectory(view);
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const entries: ZipFileEntry[] = [];
  for (let i = 0; i < count; i++) {
    if (view.getUint32(at, true) !== CENTRAL_DIRECTORY_ENTRY) throw new Error(REPORT_ARCHIVE_ERRORS.damaged);
    const flags = view.getUint16(at + 8, true);
    const method = view.getUint16(at + 10, true);
    const compressedSize = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const localOffset = view.getUint32(at + 42, true);
    const rawName = bytes.subarray(at + 46, at + 46 + nameLength);
    const name = (flags & UTF8_NAME_FLAG ? utf8 : cp866).decode(rawName);
    at += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith("/")) continue;

    // The data starts after the local header, whose name / extra may differ from the central one
    const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
    const data = bytes.subarray(dataStart, dataStart + compressedSize);
    if (method === STORED) entries.push({ name, bytes: data });
    else if (method === DEFLATED) entries.push({ name, bytes: await inflate(data) });
    else throw new Error(REPORT_ARCHIVE_ERRORS.zipMethod);
  }
  return entries;
}

function readStructure(entries: ZipFileEntry[]): JmixReportStructure {
  const entry = entries.find((e) => e.name === STRUCTURE_ENTRY);
  if (!entry) return {};
  try {
    return JSON.parse(utf8.decode(entry.bytes)) as JmixReportStructure;
  } catch {
    return {};
  }
}

// The report's template files in the order it lists them, the default one first
function templateFiles(entries: ZipFileEntry[]): { name: string; text: string }[] {
  const structure = readStructure(entries);
  const templates = structure.templates ?? [];
  const wanted = structure.defaultTemplate;
  const defaultIndex = templates.findIndex(
    (template) => (wanted?.id && template.id === wanted.id) || (wanted?.code && template.code === wanted.code),
  );
  return entries
    .map((entry) => ({ entry, match: TEMPLATE_ENTRY.exec(entry.name) }))
    .filter((item): item is { entry: ZipFileEntry; match: RegExpExecArray } => !!item.match)
    .sort((x, y) => {
      const rank = (index: number) => (index === defaultIndex ? -1 : index);
      return rank(Number(x.match[1])) - rank(Number(y.match[1]));
    })
    .map(({ entry, match }) => ({ name: match[2]!, text: utf8.decode(entry.bytes) }));
}

const isJrxml = (file: { name: string; text: string }): boolean =>
  JRXML_NAME.test(file.name) || /<jasperReport[\s>]/.test(file.text);

// The JRXML of a definition's report file: the default template when it is a
// JRXML, else the first JRXML template. Throws when there is none
export async function readReportArchiveJrxml(
  bytes: Uint8Array,
  fileName = "",
): Promise<{ jrxml: string; templateName: string }> {
  // A JRXML stored as the report file itself, not zipped
  if (!isZip(bytes)) {
    const file = { name: fileName, text: utf8.decode(bytes) };
    if (isJrxml(file)) return { jrxml: file.text, templateName: fileName };
  }
  const outer = await readZipEntries(bytes);
  const reports = outer.some((entry) => entry.name === STRUCTURE_ENTRY)
    ? [outer]
    : await Promise.all(outer.filter((entry) => isZip(entry.bytes)).map((entry) => readZipEntries(entry.bytes)));
  for (const entries of reports) {
    const file = templateFiles(entries).find(isJrxml);
    if (file) return { jrxml: file.text, templateName: file.name };
  }
  // A JRXML zipped on its own
  const loose = outer.map((entry) => ({ name: entry.name, text: utf8.decode(entry.bytes) })).find(isJrxml);
  if (loose) return { jrxml: loose.text, templateName: loose.name };
  throw new Error(REPORT_ARCHIVE_ERRORS.noJrxml);
}
