// Drawing a watermark: the same function draws it on the canvas (live, at the
// screen's resolution) and into the picture that prints (renderWatermarkPicture,
// a data URI put in the watermark's image by watermarkPictures.ts), so both
// always look the same.
//
// Text: its lines centred on its place, turned by its angle, made smaller when
// they wouldn't fit the page at that angle. Picture: its width a share of the
// page, turned the same way, optionally washed out to grey. Repeated: a grid
// over the whole page, every other row shifted by half a step.
//
// Browser only (canvas 2D, pictures loaded through the image service).

import { DEFAULT_REPORT_FONT } from "@/config/fonts.config";
import { isFileRef, resolveFileRefDisplayUrl } from "@/services/imageService";
import { hasWatermarkContent, type WatermarkPlace, type WatermarkSetup } from "./watermarkElement";

// Room kept from the page's edges when it sits in a corner or along a side
const EDGE_SHARE = 0.04;
// Share of the page a single text or picture may take at its angle
const FIT_SHARE = 0.94;
// Line height of the text, in ems
const LINE = 1.2;
// The printed picture: its scale against the design and its largest side
const TEXT_SCALE = 3;
const TEXT_MAX_SIDE = 2400;
const PICTURE_SCALE = 2;
const PICTURE_MAX_SIDE = 1800;
const JPEG_QUALITY = 0.85;

type Picture = HTMLImageElement | HTMLCanvasElement;

const loaded = new Map<string, Promise<HTMLImageElement>>();
const greyed = new Map<string, HTMLCanvasElement>();

// ── Pictures ──

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The watermark picture couldn't be loaded"));
    img.src = url;
  });
}

// The picture of a source (a stored file's fileRef, a data URI or a link),
// loaded once and shared by the canvas and the printed picture
export function loadWatermarkPicture(source: string): Promise<HTMLImageElement> {
  const cached = loaded.get(source);
  if (cached) return cached;
  const url = isFileRef(source) ? resolveFileRefDisplayUrl(source) : Promise.resolve(source);
  const pending = url.then(loadImage);
  // A failure isn't kept, so it can be tried again
  pending.catch(() => loaded.delete(source));
  loaded.set(source, pending);
  return pending;
}

// The picture washed out to grey (pixels to their brightness; works where the
// canvas `filter` doesn't, e.g. Safari's engine in the desktop app)
function greyPicture(source: string, img: HTMLImageElement): HTMLCanvasElement {
  const cached = greyed.get(source);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const y = Math.round(0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!);
    px[i] = px[i + 1] = px[i + 2] = y;
  }
  ctx.putImageData(data, 0, 0);
  greyed.set(source, canvas);
  return canvas;
}

// What is drawn for a setup's picture (grey when asked)
export async function watermarkPictureFor(setup: WatermarkSetup): Promise<Picture | null> {
  if (setup.kind !== "picture" || !setup.picture) return null;
  const img = await loadWatermarkPicture(setup.picture);
  return setup.grey ? greyPicture(setup.picture, img) : img;
}

// ── Drawing ──

const fontFor = (setup: WatermarkSetup, size: number) =>
  `${setup.bold ? "bold " : ""}${size}px "${DEFAULT_REPORT_FONT}", sans-serif`;

// The box a w × h block takes once turned by `radians`
const turnedBox = (w: number, h: number, radians: number) => {
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  return { width: w * cos + h * sin, height: w * sin + h * cos };
};

// The centre of a block on the page for a place (corners and sides keep a little room)
function centreFor(place: WatermarkPlace, box: { width: number; height: number }, width: number, height: number) {
  const edge = Math.min(width, height) * EDGE_SHARE;
  const column = place.endsWith("Left") || place === "left" ? 0 : place.endsWith("Right") || place === "right" ? 2 : 1;
  const row = place.startsWith("top") ? 0 : place.startsWith("bottom") ? 2 : 1;
  const x = [edge + box.width / 2, width / 2, width - edge - box.width / 2][column]!;
  const y = [edge + box.height / 2, height / 2, height - edge - box.height / 2][row]!;
  return { x, y };
}

// A grid over the whole page (turned with the block), each cell drawing one block
function eachTile(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  radians: number,
  stepX: number,
  stepY: number,
  draw: () => void,
) {
  const reach = Math.hypot(width, height) / 2 + Math.max(stepX, stepY);
  ctx.translate(width / 2, height / 2);
  ctx.rotate(radians);
  let row = 0;
  for (let y = -reach; y <= reach; y += stepY, row++) {
    const shift = row % 2 ? stepX / 2 : 0;
    for (let x = -reach - shift; x <= reach; x += stepX) {
      ctx.save();
      ctx.translate(x, y);
      draw();
      ctx.restore();
    }
  }
}

function drawText(ctx: CanvasRenderingContext2D, setup: WatermarkSetup, width: number, height: number, radians: number) {
  const lines = setup.text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return;
  const measure = (size: number) => {
    ctx.font = fontFor(setup, size);
    const w = Math.max(...lines.map((line) => ctx.measureText(line).width));
    return { w, h: size * LINE * lines.length };
  };
  // Never bigger than fits the page at its angle
  let size = setup.size;
  let block = measure(size);
  const box = turnedBox(block.w, block.h, radians);
  const k = Math.min(1, (width * FIT_SHARE) / box.width, (height * FIT_SHARE) / box.height);
  if (k < 1) {
    size = Math.max(4, size * k);
    block = measure(size);
  }
  ctx.fillStyle = setup.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lineHeight = size * LINE;
  const drawBlock = () =>
    lines.forEach((line, i) => ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * lineHeight));

  if (setup.repeat) {
    eachTile(ctx, width, height, radians, block.w + size * 1.5, block.h + size * 1.6, drawBlock);
    return;
  }
  const at = centreFor(setup.place, turnedBox(block.w, block.h, radians), width, height);
  ctx.translate(at.x, at.y);
  ctx.rotate(radians);
  drawBlock();
}

function drawPicture(
  ctx: CanvasRenderingContext2D,
  setup: WatermarkSetup,
  width: number,
  height: number,
  radians: number,
  picture: Picture,
) {
  const naturalW = (picture as HTMLImageElement).naturalWidth || picture.width;
  const naturalH = (picture as HTMLImageElement).naturalHeight || picture.height;
  if (!naturalW || !naturalH) return;
  let w = (width * setup.pictureSize) / 100;
  let h = (w * naturalH) / naturalW;
  const box = turnedBox(w, h, radians);
  const k = Math.min(1, width / box.width, height / box.height);
  w *= k;
  h *= k;
  const drawBlock = () => ctx.drawImage(picture, -w / 2, -h / 2, w, h);

  if (setup.repeat) {
    eachTile(ctx, width, height, radians, w * 1.5, h * 1.5, drawBlock);
    return;
  }
  const at = centreFor(setup.place, turnedBox(w, h, radians), width, height);
  ctx.translate(at.x, at.y);
  ctx.rotate(radians);
  drawBlock();
}

// Draw the watermark in a width × height area (design pixels; the caller has
// scaled the context). A picture watermark needs its picture (null: nothing yet)
export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  setup: WatermarkSetup,
  width: number,
  height: number,
  picture: Picture | null,
): void {
  if (!hasWatermarkContent(setup) || width <= 0 || height <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  ctx.globalAlpha = setup.opacity / 100;
  // Counter-clockwise on the page (the canvas turns clockwise)
  const radians = (-setup.angle * Math.PI) / 180;
  if (setup.kind === "text") drawText(ctx, setup, width, height, radians);
  else if (picture) drawPicture(ctx, setup, width, height, radians, picture);
  ctx.restore();
}

// The picture that prints, as a data URI ("" when there is nothing to print).
// Text: a see-through PNG. Picture: a JPEG on white (a faded photo as a PNG
// would weigh megabytes; it prints behind everything on a white page, so the
// white never shows)
export async function renderWatermarkPicture(setup: WatermarkSetup, width: number, height: number): Promise<string> {
  if (!hasWatermarkContent(setup)) return "";
  const picture = await watermarkPictureFor(setup);
  const isText = setup.kind === "text";
  const longest = Math.max(width, height);
  const scale = Math.min(isText ? TEXT_SCALE : PICTURE_SCALE, (isText ? TEXT_MAX_SIDE : PICTURE_MAX_SIDE) / longest);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d")!;
  if (!isText) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.scale(canvas.width / width, canvas.height / height);
  drawWatermark(ctx, setup, width, height, picture);
  return isText ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}
