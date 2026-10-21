// Sizes and draws barcodes so they fill their box, like an image. The size
// (barcodeSizing) is what the JRXML writes on the barcode component: a module
// width that makes JasperReports (barcode4j) draw the barcode as wide as the
// box, columns for PDF417, gaps and bar heights for postal codes. The canvas
// and the type picker draw with the same numbers (barcodePicture), with
// bwip-js (loaded on first use, it's large). JasperReports keeps the printed
// picture's shape inside the box (RetainShape); a QR code is centred.
import { computed, shallowRef } from "vue";
import { barcodeTypeInfo, retailCheckDigit, type BarcodeKind, type BarcodeType } from "./barcodeTypes";
import { gs1Readable } from "./gs1";

type Bwip = typeof import("bwip-js/browser");

export interface BarcodePicture {
  // SVG data URI
  uri: string;
  // Its size in report points
  width: number;
  height: number;
  // Centred in a bigger box (QR code); otherwise top left
  centered: boolean;
}

// Attributes of the barcode component in the JRXML, in points (columns for PDF417)
export type BarcodeAttributes = Partial<
  Record<
    | "moduleWidth"
    | "quietZone"
    | "verticalQuietZone"
    | "intercharGapWidth"
    | "shortBarHeight"
    | "ascenderHeight"
    | "trackHeight"
    | "minColumns"
    | "maxColumns",
    number
  >
>;

export interface BarcodeSizing {
  attributes: BarcodeAttributes;
  // Width of the narrowest bar as printed (points), to warn when it's too thin to scan
  moduleWidth: number | null;
}

const BCIDS: Record<BarcodeType, string> = {
  Code128: "code128",
  EAN128: "code128",
  Code39: "code39",
  EAN13: "ean13",
  EAN8: "ean8",
  UPCA: "upca",
  UPCE: "upce",
  Interleaved2Of5: "interleaved2of5",
  Codabar: "rationalizedCodabar",
  QRCode: "qrcode",
  DataMatrix: "datamatrix",
  PDF417: "pdf417",
  POSTNET: "postnet",
  RoyalMailCustomer: "royalmail",
  USPSIntelligentMail: "onecode",
};

// Human-readable text under 1D barcodes (barcode4j default 8pt)
const TEXT_SIZE = 8;
// Quiet zone of 1D barcodes, in modules (barcode4j default)
const LINEAR_QUIET = 10;
// barcode4j's default module width of Code 128, in points
const DEFAULT_MODULE = 0.595;
// Quiet zone of PDF417, in modules
const STACKED_QUIET = 2;
// bwip-js draws a 2D module as 2 units
const MATRIX_UNIT = 2;

// Postal codes at barcode4j's default size (points), scaled to the box width;
// bar heights follow the box height (shares of it)
const POSTAL: Partial<
  Record<BarcodeType, { bars: (n: number) => number; bar: number; gap: number; quiet: number; ascender?: number; track?: number }>
> = {
  POSTNET: { bars: (n) => 5 * n + 2, bar: 1.44, gap: 1.44, quiet: 9 },
  RoyalMailCustomer: { bars: (n) => 4 * (n + 1) + 2, bar: 1.502, gap: 1.503, quiet: 5.669, ascender: 0.3711, track: 0.2577 },
  USPSIntelligentMail: { bars: () => 65, bar: 1.44, gap: 1.8, quiet: 9, ascender: 1 / 3, track: 1 / 3 },
};
// POSTNET short bars, as a share of the tall ones (the US Postal Service sizes)
const POSTNET_SHORT_BAR = 0.4;
// Tall (1) and short (0) bars per digit
const POSTNET_DIGITS = ["11000", "00011", "00101", "00110", "01001", "01010", "01100", "10001", "10010", "10100"];

// Codabar character width in modules (wide bars 3x)
const codabarChar = (c: string) => (/[0-9\-$]/.test(c) ? 11 : 13);
const codabarWidth = (chars: string) => [...chars].reduce((sum, c) => sum + codabarChar(c), 0) + chars.length - 1;

// ---- Loading

const bwip = shallowRef<Bwip | null>(null);
let loading: Promise<void> | null = null;

// The loaded library, or null while it loads (reading it is reactive, so
// computed pictures and sizes redo themselves when it arrives)
export function useBarcodeLibrary(): Bwip | null {
  if (!bwip.value) void loadBarcodeLibrary();
  return bwip.value;
}

// True once loaded: the designer then rewrites the JRXML with barcode sizes
export const barcodeLibraryLoaded = computed(() => bwip.value !== null);

export function loadBarcodeLibrary(): Promise<void> {
  if (bwip.value) return Promise.resolve();
  loading ??= import("bwip-js/browser")
    .then((mod) => {
      bwip.value = (mod as any).default ?? mod;
    })
    .catch((error) => {
      loading = null;
      console.warn("Barcode drawing library failed to load", error);
    });
  return loading;
}

// Before writing a report that has barcodes: Code 128, GS1-128 and PDF417
// need the library to be sized
export async function ensureBarcodeLibrary(bands: { elements?: any[] }[]): Promise<void> {
  const hasBarcode = (elements: any[] = []): boolean =>
    elements.some((e) => e?.type === "barcode" || (e?.type === "frame" && hasBarcode(e.elements)));
  if (bands.some((b) => hasBarcode(b.elements))) await loadBarcodeLibrary();
}

// ---- The value as bwip-js wants it for the bars barcode4j prints

function bwipOptions(type: BarcodeType, text: string): Record<string, unknown> {
  switch (type) {
    case "Code39":
      return { text: text.toUpperCase() };
    case "Codabar": {
      // bwip-js needs start/stop letters, in capitals
      const ends = /^[a-d].*[a-d]$/s.test(text);
      return { text: (ends ? text : `a${text}a`).toUpperCase(), alttext: ends ? text.slice(1, -1) : text };
    }
    case "EAN128":
      // GS1-128 = Code 128 starting with FNC1; barcode4j separates fields with ñ
      return {
        text: `^FNC1${text.replace(/\^/g, "^094").replace(/ñ/g, "^FNC1")}`,
        parse: true,
        parsefnc: true,
        alttext: gs1Readable(text),
      };
    case "QRCode":
      return { text, eclevel: "L" };
    case "PDF417":
      // barcode4j default error correction level
      return { text, eclevel: 0 };
    default:
      return { text };
  }
}

function viewBoxOf(svg: string): [number, number] {
  const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  return m ? [Number(m[1]), Number(m[2])] : [1, 1];
}

// Encodings, kept for the session (sizing and drawing ask for the same ones)
const svgCache = new Map<string, string>();
const CACHE_LIMIT = 300;

function remember<T>(cache: Map<string, T>, key: string, make: () => T): T {
  if (cache.has(key)) {
    const hit = cache.get(key)!;
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const value = make();
  cache.set(key, value);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  return value;
}

function symbol(lib: Bwip, type: BarcodeType, text: string, extra: Record<string, unknown> = {}): string {
  const opts = { bcid: BCIDS[type], scale: 1, ...bwipOptions(type, text), ...extra } as any;
  return remember(svgCache, JSON.stringify(opts), () => lib.toSVG(opts));
}

// ---- Sizing

// Modules of a 1D barcode without its quiet zones, as barcode4j counts them;
// null when only the library can count them and it isn't loaded
function linearModules(type: BarcodeType, text: string, lib: Bwip | null): number | null {
  switch (type) {
    case "EAN13":
    case "UPCA":
      return 95;
    case "EAN8":
      return 67;
    case "UPCE":
      return 51;
    case "Code39":
      // Wide bars 2.5x, a one-module gap between characters, start/stop added
      return 14.5 * (text.length + 2) - 1;
    case "Interleaved2Of5":
      // Digits in pairs (an odd count gets a leading 0), wide bars 3x
      return 9 + 18 * Math.ceil(text.length / 2);
    case "Codabar":
      return codabarWidth(text);
    default:
      // Code 128 / GS1-128: barcode4j picks the same character sets as bwip-js
      return lib ? viewBoxOf(symbol(lib, type, text))[0] : null;
  }
}

// PDF417: the column count that gives rows about three modules tall in this box
function pdf417Layout(lib: Bwip, text: string, width: number, height: number) {
  let best = { columns: 2, rows: 3, score: Infinity };
  for (let columns = 1; columns <= 30; columns++) {
    const rows = Math.max(3, Math.round(viewBoxOf(symbol(lib, "PDF417", text, { columns }))[1] / 3));
    const module = width / (17 * columns + 69 + 2 * STACKED_QUIET);
    const score = Math.abs(Math.log(height / rows / (3 * module)));
    if (score < best.score) best = { columns, rows, score };
    if (rows === 3) break;
  }
  return best;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

interface Plan {
  attributes: BarcodeAttributes;
  moduleWidth: number | null;
  // linear: module width and count; stacked: columns and rows
  module?: number;
  modules?: number;
  columns?: number;
  rows?: number;
}

// width × height: the barcode's own box (turned a quarter, the element's height × width)
function plan(type: BarcodeType, text: string, width: number, height: number, lib: Bwip | null): Plan | null {
  switch (barcodeTypeInfo(type).kind) {
    case "linear": {
      const modules = linearModules(type, text, lib);
      if (!modules) return null;
      const module = width / (modules + 2 * LINEAR_QUIET);
      return {
        attributes: { moduleWidth: round(module), quietZone: round(LINEAR_QUIET * module) },
        moduleWidth: module,
        module,
        modules,
      };
    }
    case "stacked": {
      if (!lib) return null;
      const { columns, rows } = pdf417Layout(lib, text, width, height);
      // barcode4j makes each row as tall as the box minus a text line, then
      // the picture is scaled into the box: a module width giving the box's
      // proportions makes it fill the box
      const span = 17 * columns + 69 + 2 * STACKED_QUIET;
      const rowHeight = Math.max(1, height - TEXT_SIZE);
      const module = (width * rows * rowHeight) / Math.max(1, span * height - 2 * STACKED_QUIET * width);
      return {
        attributes: {
          minColumns: columns,
          maxColumns: columns,
          moduleWidth: round(module),
          quietZone: round(STACKED_QUIET * module),
          verticalQuietZone: round(STACKED_QUIET * module),
        },
        moduleWidth: width / span,
        columns,
        rows,
      };
    }
    case "postal": {
      const p = POSTAL[type]!;
      const span = (p.bars(text.length) - 1) * (p.bar + p.gap) + p.bar;
      // Royal Mail uses its quiet zone above and below too (barcode4j ignores
      // verticalQuietZone there): kept small so short boxes keep tall bars
      const quiet =
        type === "RoyalMailCustomer"
          ? Math.min((p.quiet * width) / (span + 2 * p.quiet), height * 0.1)
          : (p.quiet * width) / (span + 2 * p.quiet);
      const k = (width - 2 * quiet) / span;
      const attributes: BarcodeAttributes = {
        moduleWidth: round(p.bar * k),
        intercharGapWidth: round(p.gap * k),
        quietZone: round(quiet),
      };
      if (type === "POSTNET") {
        attributes.verticalQuietZone = 0;
        attributes.shortBarHeight = round(height * POSTNET_SHORT_BAR);
      } else {
        const bars = type === "RoyalMailCustomer" ? height - 2 * quiet : height;
        if (type !== "RoyalMailCustomer") attributes.verticalQuietZone = 0;
        attributes.ascenderHeight = round(bars * p.ascender!);
        attributes.trackHeight = round(bars * p.track!);
      }
      return { attributes, moduleWidth: null };
    }
    default:
      // QR code and Data Matrix are scaled into the box as they are
      return { attributes: {}, moduleWidth: null };
  }
}

// What the JRXML writes for a barcode in a box of this size, or null when
// it can't be sized yet (library loading): JasperReports' defaults then apply
export function barcodeSizing(type: BarcodeType, text: string, width: number, height: number): BarcodeSizing | null {
  if (!text) return null;
  try {
    const p = plan(type, text, width, height, useBarcodeLibrary());
    return p && { attributes: p.attributes, moduleWidth: p.moduleWidth };
  } catch {
    return null;
  }
}

// ---- Drawing

const innerOf = (svg: string) => svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

const frame = (width: number, height: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;

// The symbol stretched into (x, y, w, h)
function placed(svg: string, x: number, y: number, w: number, h: number) {
  const [vw, vh] = viewBoxOf(svg);
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="none">${innerOf(svg)}</svg>`;
}

const toUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

function picture(svg: string, width: number, height: number, centered = false): BarcodePicture {
  return { uri: toUri(svg), width, height, centered };
}

// ---- 1D barcodes: bwip-js gives the bars; the text is written like barcode4j
// does (8pt Helvetica, EAN/UPC digits in groups), since bwip-js has a minimum
// text size and its own layout

// Space under the bars for the text; EAN/UPC guard bars reach half way into it
const TEXT_AREA = TEXT_SIZE + 2;
const FONT = "Helvetica, Arial, sans-serif";
const RETAIL = new Set<BarcodeType>(["EAN13", "EAN8", "UPCA", "UPCE"]);
// Average digit width of the font at 8pt
const CHAR_WIDTH = 0.556 * TEXT_SIZE;

interface Bar {
  x: number;
  width: number;
  bottom: number;
}

// The bars of a bwip-js 1D symbol: stroked lines "M x bottom L x 0"
function barsOf(svg: string): Bar[] {
  const bars: Bar[] = [];
  for (const path of svg.matchAll(/stroke-width="([\d.]+)" d="([^"]+)"/g)) {
    const width = Number(path[1]);
    for (const line of (path[2] ?? "").matchAll(/M([\d.]+) ([\d.]+)L[\d.]+ ([\d.]+)/g)) {
      bars.push({ x: Number(line[1]) - width / 2, width, bottom: Math.max(Number(line[2]), Number(line[3])) });
    }
  }
  return bars;
}

// Text pieces under the bars, in modules from the first bar: a group spread
// between two positions, or a single digit beside the bars
type TextPiece = { text: string; from: number; to: number } | { text: string; at: number; anchor: "start" | "end" };

function humanReadable(type: BarcodeType, text: string, modules: number): TextPiece[] {
  // The check digit is printed even when it isn't typed
  const check = retailCheckDigit(type, text);
  const full = (digits: number) => (text.length === digits || !check ? text : text + check.digit);
  switch (type) {
    case "EAN13": {
      const d = full(13);
      return [{ text: d.charAt(0), at: -2, anchor: "end" }, { text: d.slice(1, 7), from: 3, to: 45 }, { text: d.slice(7), from: 50, to: 92 }];
    }
    case "EAN8": {
      const d = full(8);
      return [{ text: d.slice(0, 4), from: 3, to: 31 }, { text: d.slice(4), from: 36, to: 64 }];
    }
    case "UPCA": {
      const d = full(12);
      return [
        { text: d.charAt(0), at: -2, anchor: "end" },
        { text: d.slice(1, 6), from: 10, to: 45 },
        { text: d.slice(6, 11), from: 50, to: 85 },
        { text: d.charAt(11), at: 97, anchor: "start" },
      ];
    }
    case "UPCE": {
      const d = full(8);
      return [{ text: d.charAt(0), at: -2, anchor: "end" }, { text: d.slice(1, 7), from: 3, to: 45 }, { text: d.charAt(7), at: 53, anchor: "start" }];
    }
    case "EAN128":
      return [{ text: gs1Readable(text), from: 0, to: modules }];
    case "Codabar":
      return [{ text: /^[a-d].*[a-d]$/s.test(text) ? text.slice(1, -1) : text, from: 0, to: modules }];
    default:
      return [{ text, from: 0, to: modules }];
  }
}

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function linearPicture(lib: Bwip, type: BarcodeType, text: string, m: number, modules: number, width: number, height: number) {
  // bwip-js's own text decides which bars are guard bars (EAN/UPC)
  const bars = barsOf(symbol(lib, type, text, { includetext: true, height: 10 }));
  if (!bars.length) return null;
  const left = Math.min(...bars.map((b) => b.x));
  const span = Math.max(...bars.map((b) => b.x + b.width)) - left;
  const normal = Math.min(...bars.map((b) => b.bottom));
  // bwip-js draws Code 39 wide bars 3x and Codabar with start/stop letters:
  // fitted to the width barcode4j prints
  const sx = (modules * m) / span;
  const x0 = LINEAR_QUIET * m;
  const barBottom = Math.max(1, height - TEXT_AREA);
  const guardBottom = Math.max(1, height - TEXT_AREA / 2);
  const rects = bars
    .map((b) => {
      const h = b.bottom > normal + 0.5 ? guardBottom : barBottom;
      return `<rect x="${round(x0 + (b.x - left) * sx)}" y="0" width="${round(b.width * sx)}" height="${round(h)}"/>`;
    })
    .join("");
  const baseline = round(height - 2);
  const texts = humanReadable(type, text, modules)
    .map((piece) => {
      const attrs = `y="${baseline}" font-family="${FONT}" font-size="${TEXT_SIZE}"`;
      if ("at" in piece) {
        return `<text x="${round(x0 + piece.at * m)}" text-anchor="${piece.anchor}" ${attrs}>${escapeXml(piece.text)}</text>`;
      }
      const room = (piece.to - piece.from) * m;
      // EAN/UPC digits spread over their group, like barcode4j, when there is room
      const spread =
        RETAIL.has(type) && room > piece.text.length * CHAR_WIDTH * 1.15
          ? ` textLength="${round(room * 0.92)}" lengthAdjust="spacing"`
          : "";
      return `<text x="${round(x0 + ((piece.from + piece.to) / 2) * m)}" text-anchor="middle"${spread} ${attrs}>${escapeXml(piece.text)}</text>`;
    })
    .join("");
  return picture(frame(width, height, `<g fill="#000">${rects}${texts}</g>`), width, height);
}

function draw(lib: Bwip, type: BarcodeType, text: string, width: number, height: number): BarcodePicture | null {
  const p = plan(type, text, width, height, lib);
  if (!p) return null;

  switch (barcodeTypeInfo(type).kind) {
    case "linear":
      return linearPicture(lib, type, text, p.module!, p.modules!, width, height);
    case "stacked": {
      // Fills the box, rows stretched, with the quiet zone all round
      const svg = symbol(lib, type, text, { columns: p.columns });
      const q = STACKED_QUIET * p.moduleWidth!;
      return picture(frame(width, height, placed(svg, q, q, width - 2 * q, height - 2 * q)), width, height);
    }
    case "postal": {
      const a = p.attributes;
      const q = a.quietZone!;
      if (type === "POSTNET") {
        const pattern = `1${[...text].map((d) => POSTNET_DIGITS[Number(d)] ?? "").join("")}1`;
        const pitch = a.moduleWidth! + a.intercharGapWidth!;
        const rects = [...pattern]
          .map((tall, i) => {
            const h = tall === "1" ? height : a.shortBarHeight!;
            return `<rect x="${q + i * pitch}" y="${height - h}" width="${a.moduleWidth}" height="${h}"/>`;
          })
          .join("");
        return picture(frame(width, height, rects), width, height);
      }
      const v = type === "RoyalMailCustomer" ? q : 0;
      return picture(frame(width, height, placed(symbol(lib, type, text), q, v, width - 2 * q, height - 2 * v)), width, height);
    }
    default: {
      // QR code (centred, with a 4-module margin) and Data Matrix (1 module)
      const svg = symbol(lib, type, text);
      const [w, h] = viewBoxOf(svg);
      const q = (type === "QRCode" ? 4 : 1) * MATRIX_UNIT;
      return picture(frame(w + 2 * q, h + 2 * q, placed(svg, q, q, w, h)), w + 2 * q, h + 2 * q, type === "QRCode");
    }
  }
}

// A barcode in a table cell, as JasperReports prints it there (no size is
// written: values differ per row): Code 128 at its natural width and the
// row's height, shrunk to fit a narrow cell; a QR code or Data Matrix square
export function barcodeCellPicture(type: BarcodeType, text: string, height: number): BarcodePicture | null {
  const lib = useBarcodeLibrary();
  if (!lib || !text) return null;
  if (barcodeTypeInfo(type).kind !== "linear") return barcodePicture(type, text, height, height);
  const modules = linearModules(type, text, lib);
  return modules ? barcodePicture(type, text, (modules + 2 * LINEAR_QUIET) * DEFAULT_MODULE, height) : null;
}

// Picker cards: each type's sample, drawn for a small box of its kind
const SAMPLE_SIZES: Record<BarcodeKind, [number, number]> = {
  linear: [110, 40],
  stacked: [110, 40],
  square: [40, 40],
  postal: [110, 16],
};

export function barcodeSamplePicture(type: BarcodeType): BarcodePicture | null {
  const info = barcodeTypeInfo(type);
  const [width, height] = SAMPLE_SIZES[info.kind];
  return barcodePicture(type, info.sample, width, height);
}

const pictureCache = new Map<string, BarcodePicture | null>();

// The barcode for a value in a box of this size (points), or null when it
// can't be drawn (a value the type can't hold) or the library is loading.
export function barcodePicture(type: BarcodeType, text: string, width: number, height: number): BarcodePicture | null {
  const lib = useBarcodeLibrary();
  if (!lib || !text) return null;
  const w = Math.max(8, Math.round(width));
  const h = Math.max(8, Math.round(height));
  return remember(pictureCache, `${type}\u0000${w}\u0000${h}\u0000${text}`, () => {
    try {
      return draw(lib, type, text, w, h);
    } catch {
      return null;
    }
  });
}
