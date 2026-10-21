// GS1-128 values as fields: a number code (application identifier, "AI")
// saying what the value is, then the value. barcode4j takes them written one
// after the other, with "ñ" (FNC1) after a field of variable length that
// isn't last: "0109501101530003" + "17261231" + "10ABC123".

export const GS1_SEPARATOR = "ñ";

export type Gs1Input = "digits" | "date" | "text" | "weight";

export interface Gs1Ai {
  ai: string;
  // Translation key under barcode.gs1.fields
  key: string;
  input: Gs1Input;
  // Fixed value length; otherwise up to `max` characters
  length?: number;
  max?: number;
  // The last digit is a check digit (item number, shipping container code)
  check?: boolean;
}

// The fields the builder offers, most used first
export const GS1_AIS: readonly Gs1Ai[] = [
  { ai: "01", key: "gtin", input: "digits", length: 14, check: true },
  { ai: "10", key: "batch", input: "text", max: 20 },
  { ai: "17", key: "expiry", input: "date", length: 6 },
  { ai: "15", key: "bestBefore", input: "date", length: 6 },
  { ai: "11", key: "production", input: "date", length: 6 },
  { ai: "21", key: "serial", input: "text", max: 20 },
  { ai: "37", key: "count", input: "digits", max: 8 },
  { ai: "3103", key: "netWeight", input: "weight", length: 6 },
  { ai: "00", key: "sscc", input: "digits", length: 18, check: true },
];

export const gs1Ai = (ai: string) => GS1_AIS.find((a) => a.ai === ai);

export interface Gs1Field {
  ai: string;
  value: string;
}

// GS1 check digit (EAN/UPC rule) of the digits before it
export function gs1CheckDigit(digits: string): string {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) sum += Number(digits[digits.length - 1 - i]) * (i % 2 === 0 ? 3 : 1);
  return String((10 - (sum % 10)) % 10);
}

// A field as written in the value: an item number typed without its check
// digit gets it added
function written(field: Gs1Field): string {
  const def = gs1Ai(field.ai);
  const value = field.value.trim();
  if (def?.check && def.length && /^\d+$/.test(value) && value.length === def.length - 1) {
    return value + gs1CheckDigit(value);
  }
  return value;
}

export function composeGs1(fields: Gs1Field[]): string {
  const used = fields.filter((f) => f.value.trim());
  return used
    .map((f, i) => {
      const def = gs1Ai(f.ai);
      const variable = !def?.length;
      return f.ai + written(f) + (variable && i < used.length - 1 ? GS1_SEPARATOR : "");
    })
    .join("");
}

// The builder's fields for a value, or null when it holds a code the builder
// doesn't know (the value is then edited as plain text)
export function parseGs1(text: string): Gs1Field[] | null {
  const fields: Gs1Field[] = [];
  let rest = text;
  while (rest) {
    const def = GS1_AIS.find((a) => rest.startsWith(a.ai));
    if (!def) return null;
    rest = rest.slice(def.ai.length);
    let value: string;
    if (def.length) {
      value = rest.slice(0, def.length);
      rest = rest.slice(def.length);
    } else {
      const end = rest.indexOf(GS1_SEPARATOR);
      value = end < 0 ? rest : rest.slice(0, end);
      rest = end < 0 ? "" : rest.slice(end);
    }
    rest = rest.replace(new RegExp(`^${GS1_SEPARATOR}`), "");
    fields.push({ ai: def.ai, value });
  }
  return fields;
}

// GS1 number codes with a fixed value length, for the printed text
const FIXED: Record<string, number> = { "00": 18, "01": 14, "02": 14, "11": 6, "12": 6, "13": 6, "15": 6, "16": 6, "17": 6, "20": 2 };
const VARIABLE = /^(10|21|22|30|37|9\d)$/;

// The text under a GS1-128 code, codes in brackets like barcode4j prints it:
// "(01)09501101530003(10)ABC"; anything not understood is shown as typed
export function gs1Readable(text: string): string {
  const plain = text.replace(/ñ/g, "");
  let rest = text;
  let out = "";
  while (rest) {
    let ai = rest.slice(0, 2);
    let length = FIXED[ai];
    if (/^3[1-6]$/.test(ai)) {
      // Measures (net weight…): four-digit code, six digits
      ai = rest.slice(0, 4);
      length = 6;
    } else if (length === undefined && !VARIABLE.test(ai)) {
      return plain;
    }
    const start = ai.length;
    const end = length !== undefined ? start + length : rest.indexOf("ñ", start) < 0 ? rest.length : rest.indexOf("ñ", start);
    out += `(${ai})${rest.slice(start, end)}`;
    rest = rest.slice(end).replace(/^ñ/, "");
  }
  return out;
}

// A problem with one field, as a translation key under barcode.problems
export function checkGs1Field(field: Gs1Field): { key: string; params?: Record<string, string> } | null {
  const def = gs1Ai(field.ai);
  const value = field.value.trim();
  if (!def) return null;
  if (!value) return { key: "empty" };
  if (def.input === "digits" || def.input === "date" || def.input === "weight") {
    if (!/^\d+$/.test(value)) return { key: "digitsOnly" };
  } else {
    const bad = [...value].find((c) => !/[\x21-\x7e]/.test(c));
    if (bad !== undefined) return { key: "badCharacter", params: { char: bad === " " ? "␣" : bad } };
  }
  if (def.length) {
    const full = written(field);
    if (full.length !== def.length) {
      return def.check
        ? { key: "digitCount", params: { a: String(def.length - 1), b: String(def.length) } }
        : { key: "gs1Length", params: { count: String(def.length) } };
    }
    if (def.check) {
      const expected = gs1CheckDigit(full.slice(0, -1));
      if (full.slice(-1) !== expected) return { key: "checkDigit", params: { digit: expected } };
    }
    if (def.input === "date") {
      const month = Number(full.slice(2, 4));
      const day = Number(full.slice(4, 6));
      if (month < 1 || month > 12 || day > 31) return { key: "gs1Date" };
    }
  } else if (def.max && value.length > def.max) {
    return { key: "gs1TooLong", params: { max: String(def.max) } };
  }
  return null;
}

// Dates are YYMMDD in the code, YYYY-MM-DD in a date field
export const gs1DateToIso = (v: string) => (/^\d{6}$/.test(v) ? `20${v.slice(0, 2)}-${v.slice(2, 4)}-${v.slice(4, 6)}` : "");
export const isoToGs1Date = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v.slice(2).replace(/-/g, "") : "");

// Net weight: kilograms with three decimals ("001250" = 1.250 kg)
export const gs1WeightToKg = (v: string) => (/^\d{6}$/.test(v) ? String(Number(v) / 1000) : "");
export const kgToGs1Weight = (v: string) => {
  const kg = Number(v);
  return v.trim() && Number.isFinite(kg) && kg >= 0 && kg < 1000 ? String(Math.round(kg * 1000)).padStart(6, "0") : "";
};
