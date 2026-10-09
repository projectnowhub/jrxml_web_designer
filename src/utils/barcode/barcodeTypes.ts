// Barcode types the designer offers (JasperReports barcode components), their
// samples and the input rules of the library that prints them (barcode4j 2.1),
// so the editor can show what each type looks like and catch a value that
// would stop the report before it reaches the server
import type { BarcodeElement } from "../../types";

export type BarcodeType = BarcodeElement["barcodeType"];

export type BarcodeGroup = "products" | "labels" | "square" | "postal";

// How it's drawn: bars (1D), stacked rows (PDF417), a square (QR, Data Matrix), postal bars
export type BarcodeKind = "linear" | "stacked" | "square" | "postal";

export interface BarcodeTypeInfo {
  type: BarcodeType;
  group: BarcodeGroup;
  kind: BarcodeKind;
  // A value that fits, used for the picker and when the current value doesn't fit
  sample: string;
}

export const BARCODE_GROUPS: readonly BarcodeGroup[] = ["products", "labels", "square", "postal"];

// In picker order; every sample is accepted by barcode4j
export const BARCODE_TYPES: readonly BarcodeTypeInfo[] = [
  { type: "EAN13", group: "products", kind: "linear", sample: "5901234123457" },
  { type: "EAN8", group: "products", kind: "linear", sample: "96385074" },
  { type: "UPCA", group: "products", kind: "linear", sample: "036000291452" },
  { type: "UPCE", group: "products", kind: "linear", sample: "01234565" },
  { type: "Code128", group: "labels", kind: "linear", sample: "CDP-000123" },
  { type: "EAN128", group: "labels", kind: "linear", sample: "0109501101530003" },
  { type: "Code39", group: "labels", kind: "linear", sample: "CDP-000123" },
  { type: "Interleaved2Of5", group: "labels", kind: "linear", sample: "12345678" },
  { type: "Codabar", group: "labels", kind: "linear", sample: "40156" },
  { type: "QRCode", group: "square", kind: "square", sample: "https://www.example.com" },
  { type: "DataMatrix", group: "square", kind: "square", sample: "CDP-000123" },
  { type: "PDF417", group: "square", kind: "stacked", sample: "CDP Report 000123" },
  { type: "POSTNET", group: "postal", kind: "postal", sample: "12345" },
  { type: "RoyalMailCustomer", group: "postal", kind: "postal", sample: "LU178XE" },
  { type: "USPSIntelligentMail", group: "postal", kind: "postal", sample: "01234567094987654321" },
];

// A new barcode's box, and the box a barcode gets when its kind changes
export const BARCODE_SIZES: Record<BarcodeKind, { width: number; height: number }> = {
  linear: { width: 160, height: 60 },
  stacked: { width: 160, height: 60 },
  square: { width: 80, height: 80 },
  postal: { width: 180, height: 20 },
};

export const BARCODE_TYPE_IDS: readonly BarcodeType[] = BARCODE_TYPES.map((b) => b.type);

// Example values shown under the value field, with what each one is (a
// translation key under barcode.examples); all accepted by barcode4j
export const BARCODE_EXAMPLES: Record<BarcodeType, readonly { value: string; note: string }[]> = {
  EAN13: [
    { value: "5901234123457", note: "withCheckDigit" },
    { value: "590123412345", note: "checkDigitAdded" },
  ],
  EAN8: [
    { value: "96385074", note: "withCheckDigit" },
    { value: "9638507", note: "checkDigitAdded" },
  ],
  UPCA: [
    { value: "036000291452", note: "withCheckDigit" },
    { value: "03600029145", note: "checkDigitAdded" },
  ],
  UPCE: [
    { value: "01234565", note: "withCheckDigit" },
    { value: "0123456", note: "checkDigitAdded" },
  ],
  Code128: [
    { value: "CDP-000123", note: "assetTag" },
    { value: "INV-2026-0042", note: "invoiceNumber" },
    { value: "PO 4500012345", note: "purchaseOrder" },
  ],
  EAN128: [
    { value: "0109501101530003", note: "gs1Item" },
    { value: "01095011015300031726123110ABC123", note: "gs1ItemExpiryBatch" },
  ],
  Code39: [
    { value: "CDP-000123", note: "assetTag" },
    { value: "PART 12345", note: "partNumber" },
  ],
  Interleaved2Of5: [
    { value: "12345678", note: "cartonNumber" },
    { value: "10012345678902", note: "itf14" },
  ],
  Codabar: [
    { value: "40156", note: "sampleNumber" },
    { value: "a123456b", note: "codabarEnds" },
  ],
  QRCode: [
    { value: "https://www.example.com", note: "webLink" },
    { value: "mailto:info@example.com?subject=Report", note: "emailAddress" },
    { value: "WIFI:T:WPA;S:Office;P:secret123;;", note: "wifiLogin" },
  ],
  DataMatrix: [
    { value: "CDP-000123", note: "assetTag" },
    { value: "SN:ABC123456", note: "serialNumber" },
  ],
  PDF417: [
    { value: "CDP Report 000123", note: "documentReference" },
    { value: "Ticket 2026-0042 Gate B Seat 12", note: "ticket" },
  ],
  POSTNET: [
    { value: "12345", note: "zip5" },
    { value: "123456789", note: "zip9" },
  ],
  RoyalMailCustomer: [
    { value: "LU178XE", note: "postcode" },
    { value: "SW1A1AA", note: "postcode" },
  ],
  USPSIntelligentMail: [
    { value: "01234567094987654321", note: "tracking" },
    { value: "0123456709498765432112345", note: "trackingZip" },
  ],
};

// Types a table column can be shown as: they hold any text, so no row can
// stop the report (Code 128 values are kept to plain characters)
export const TABLE_BARCODE_TYPES = ["Code128", "QRCode", "DataMatrix"] as const;
export type TableBarcodeType = (typeof TABLE_BARCODE_TYPES)[number];
export const isTableBarcodeType = (v: unknown): v is TableBarcodeType => TABLE_BARCODE_TYPES.includes(v as TableBarcodeType);

// The barcode a table column prints its values as, if any (text columns only)
export const tableColumnBarcode = (column: { type: string; barcode?: unknown }): TableBarcodeType | null =>
  column.type === "text" && isTableBarcodeType(column.barcode) ? column.barcode : null;

// A table cell's value as the report encodes it: null (nothing printed) when
// empty, Code 128 values kept to plain characters
export function tableBarcodeText(type: TableBarcodeType, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  return type === "Code128" ? text.replace(/[^\x20-\x7e]/g, "?") : text;
}

// Unknown types read as Code 128, the default
export const barcodeTypeInfo = (type: BarcodeType): BarcodeTypeInfo =>
  BARCODE_TYPES.find((b) => b.type === type) ?? BARCODE_TYPES.find((b) => b.type === "Code128")!;

export const barcodeTypesInGroup = (group: BarcodeGroup) => BARCODE_TYPES.filter((b) => b.group === group);

// A new barcode of this type, with its sample value
export function buildBarcodeElement(type: BarcodeType): Omit<BarcodeElement, "uuid"> {
  const info = barcodeTypeInfo(type);
  return {
    type: "barcode",
    x: 0,
    y: 0,
    ...BARCODE_SIZES[info.kind],
    barcodeType: type,
    codeExpression: toBarcodeExpression(info.sample),
    evaluationTime: "Now",
    printWhenExpression: "",
  } as Omit<BarcodeElement, "uuid">;
}

// ---- Each type keeps its own value

// The values typed for the other types, kept in the JRXML
export const BARCODE_VALUES_PROPERTY = "com.cdp.barcode.values";

// Switch a barcode to another type: the current value is kept for its type,
// and the new type gets the value typed for it before, or its sample
export function switchBarcodeType(element: BarcodeElement, type: BarcodeType): void {
  const values = { ...(element.valuesByType ?? {}) };
  const current = element.codeExpression ?? "";
  // A sample needs no keeping: the type shows it anyway
  if (current && current !== toBarcodeExpression(barcodeTypeInfo(element.barcodeType).sample)) {
    values[element.barcodeType] = current;
  } else {
    delete values[element.barcodeType];
  }
  element.codeExpression = values[type] ?? toBarcodeExpression(barcodeTypeInfo(type).sample);
  delete values[type];
  element.barcodeType = type;
  if (Object.keys(values).length) element.valuesByType = values;
  else delete element.valuesByType;
}

// The kept values as written in the property, and read back (unknown types dropped)
export const serializeBarcodeValues = (values: BarcodeElement["valuesByType"]) =>
  values && Object.keys(values).length ? JSON.stringify(values) : "";

export function parseBarcodeValues(json: string | null | undefined): BarcodeElement["valuesByType"] {
  if (!json) return undefined;
  try {
    const raw = JSON.parse(json);
    const values: Record<string, string> = {};
    for (const type of BARCODE_TYPE_IDS) if (typeof raw?.[type] === "string") values[type] = raw[type];
    return Object.keys(values).length ? values : undefined;
  } catch {
    return undefined;
  }
}

// ---- The value: plain text is stored as a Java string literal, "$..." as an expression

const JAVA_LITERAL = /^"(?:[^"\\]|\\.)*"$/s;

export interface BarcodeValue {
  text: string;
  // An expression ($F{…}, $P{…}): the value is only known when the report runs
  isExpression: boolean;
}

export function readBarcodeValue(codeExpression: string | undefined): BarcodeValue {
  const raw = (codeExpression ?? "").trim();
  if (!raw) return { text: "", isExpression: false };
  if (JAVA_LITERAL.test(raw)) {
    const text = raw.slice(1, -1).replace(/\\(.)/g, (_, c: string) => (c === "n" ? "\n" : c === "t" ? "\t" : c));
    return { text, isExpression: false };
  }
  return { text: raw, isExpression: true };
}

// A field, parameter or variable ($F{…}) is kept as an expression; anything
// else is the text itself, exactly as typed
export function toBarcodeExpression(value: string): string {
  if (/^\s*\$[FPV]\{/.test(value)) return value.trim();
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n")}"`;
}

// The text the barcode is sized and drawn for: the value, or the type's sample
// when it comes from the data or doesn't fit
export function printedBarcodeText(type: BarcodeType, codeExpression: string | undefined): string {
  const value = readBarcodeValue(codeExpression);
  return value.isExpression || checkBarcodeValue(type, value.text) ? barcodeTypeInfo(type).sample : value.text;
}

// ---- Input rules (barcode4j), as a translation key plus its values

export interface BarcodeProblem {
  key: string;
  params?: Record<string, string>;
}

const DIGITS = /^\d+$/;

// EAN / UPC / GTIN check digit of the digits before it
function checkDigit(digits: string): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const n = Number(digits[digits.length - 1 - i]);
    sum += i % 2 === 0 ? n * 3 : n;
  }
  return (10 - (sum % 10)) % 10;
}

// EAN/UPC: the check digit of a value typed without it, and whether a typed
// one is right (for the hint under the value)
export function retailCheckDigit(type: BarcodeType, text: string): { digit: string; typed: boolean } | null {
  const plain = { EAN13: 12, EAN8: 7, UPCA: 11, UPCE: 7 }[type as string];
  if (!plain || !DIGITS.test(text) || (text.length !== plain && text.length !== plain + 1)) return null;
  if (type === "UPCE" && text[0] !== "0" && text[0] !== "1") return null;
  const digits = type === "UPCE" ? upceAsUpca(text.slice(0, 7)) : text.slice(0, plain);
  return { digit: String(checkDigit(digits)), typed: text.length === plain + 1 };
}

// UPC-E written out as UPC-A, for its check digit
function upceAsUpca(d: string): string {
  const [ns, a, b, c, e, f, g = ""] = d;
  if ("012".includes(g)) return `${ns}${a}${b}${g}0000${c}${e}${f}`;
  if (g === "3") return `${ns}${a}${b}${c}00000${e}${f}`;
  if (g === "4") return `${ns}${a}${b}${c}${e}00000${f}`;
  return `${ns}${a}${b}${c}${e}${f}0000${g}`;
}

// Digits only, one of the counts, and a right check digit when it's given
function checkRetail(text: string, plain: number, check: (digits: string) => number = checkDigit): BarcodeProblem | null {
  if (!DIGITS.test(text)) return { key: "digitsOnly" };
  if (text.length !== plain && text.length !== plain + 1) {
    return { key: "digitCount", params: { a: String(plain), b: String(plain + 1) } };
  }
  if (text.length === plain + 1) {
    const expected = check(text.slice(0, plain));
    if (Number(text[plain]) !== expected) return { key: "checkDigit", params: { digit: String(expected) } };
  }
  return null;
}

// The first character a pattern doesn't allow
function badCharacter(text: string, allowed: RegExp): BarcodeProblem | null {
  const bad = [...text].find((c) => !allowed.test(c));
  return bad === undefined ? null : { key: "badCharacter", params: { char: bad === " " ? "␣" : bad } };
}

export function checkBarcodeValue(type: BarcodeType, text: string): BarcodeProblem | null {
  if (!text) return { key: "empty" };
  switch (type) {
    case "EAN13":
      return checkRetail(text, 12);
    case "EAN8":
      return checkRetail(text, 7);
    case "UPCA":
      return checkRetail(text, 11);
    case "UPCE": {
      if (DIGITS.test(text) && text[0] !== "0" && text[0] !== "1") return { key: "upceStart" };
      // Its check digit is worked out on the number written out as UPC-A
      return checkRetail(text, 7, (digits) => checkDigit(upceAsUpca(digits)));
    }
    case "Code128":
      return badCharacter(text, /[\x00-\x7f]/);
    case "EAN128": {
      const bad = badCharacter(text, /[\x00-\x7fñ]/);
      if (bad) return bad;
      if (!/^\d{2}/.test(text)) return { key: "gs1Start" };
      // Item number (GTIN): 14 digits with a check digit
      if (/^0[12]/.test(text)) {
        const gtin = text.slice(2, 16);
        if (!/^\d{14}$/.test(gtin)) return { key: "gs1Gtin" };
        const expected = checkDigit(gtin.slice(0, 13));
        if (Number(gtin[13]) !== expected) return { key: "checkDigit", params: { digit: String(expected) } };
      }
      return null;
    }
    case "Code39":
      return badCharacter(text, /[0-9A-Za-z \-.$/+%]/);
    case "Interleaved2Of5":
    case "POSTNET":
      if (!DIGITS.test(text)) return { key: "digitsOnly" };
      if (type === "POSTNET" && ![5, 9, 11].includes(text.length)) return { key: "postnetLength" };
      return null;
    case "Codabar": {
      // Optional start and stop letters a–d, lowercase, at both ends
      const ends = /^[a-d]/.test(text) || /[a-d]$/.test(text);
      if (ends && !/^[a-d].*[a-d]$/s.test(text)) return { key: "codabarEnds" };
      const body = ends ? text.slice(1, -1) : text;
      if (/[A-D]/.test(body[0] ?? "") || /[A-D]/.test(body[body.length - 1] ?? "")) return { key: "codabarEnds" };
      return badCharacter(body, /[0-9\-$:/.+]/);
    }
    case "RoyalMailCustomer":
      return badCharacter(text, /[0-9A-Z]/);
    case "USPSIntelligentMail":
      if (!DIGITS.test(text)) return { key: "digitsOnly" };
      if (![20, 25, 29, 31].includes(text.length)) return { key: "uspsLength" };
      return null;
    default:
      // QR Code, Data Matrix, PDF417: any text
      return null;
  }
}
