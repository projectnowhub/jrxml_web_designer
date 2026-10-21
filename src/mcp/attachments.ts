// Files the user gives the AI assistant in the chat: pictures (screenshots,
// logos, sketches), PDFs and text files (notes, CSV, JRXML…). They are read
// into what the model needs (pictures scaled down to save tokens), and an
// attached picture can be put into the report: the AI names it as
// "attachment:<id>" and it is stored like a picture the user uploads.

import { resolveImageSource } from "@/services/imageService";

export type AttachmentKind = "image" | "pdf" | "text";

export interface ChatAttachment {
  // "img-1", "file-2": how the model names it
  id: string;
  name: string;
  kind: AttachmentKind;
  mediaType: string;
  size: number;
  // base64 (picture, PDF) or the text itself (text file)
  data: string;
  // A picture's own size, for keeping its proportions on the page
  width?: number;
  height?: number;
  // The file as given (put into the report from it) and its thumbnail
  file: File;
  previewUrl?: string;
}

export const ATTACHMENT_LIMITS = {
  count: 10,
  imageBytes: 15 * 1024 * 1024,
  pdfBytes: 20 * 1024 * 1024,
  textBytes: 2 * 1024 * 1024,
  // What the model reads of a text file
  textChars: 200_000,
};

// The longest side a picture is sent at (enough for the model to read it)
const MAX_IMAGE_SIDE = 1568;

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const TEXT_EXTENSIONS = /\.(txt|md|markdown|csv|tsv|json|xml|jrxml|html?|ya?ml|log|sql)$/i;

export const ATTACHMENT_ACCEPT = [
  ...IMAGE_TYPES,
  "application/pdf",
  ".txt,.md,.markdown,.csv,.tsv,.json,.xml,.jrxml,.html,.htm,.yaml,.yml,.log,.sql",
].join(",");

// Why a file can't be attached (a translation key under ai.attach.errors)
export class AttachmentError extends Error {
  readonly code: "type" | "tooLarge" | "unreadable";
  readonly fileName: string;
  constructor(code: AttachmentError["code"], fileName: string) {
    super(`${code}: ${fileName}`);
    this.code = code;
    this.fileName = fileName;
  }
}

export function kindOf(file: File): AttachmentKind | null {
  if (IMAGE_TYPES.includes(file.type)) return "image";
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return "pdf";
  if (file.type.startsWith("text/") || file.type === "application/json" || file.type === "application/xml" || TEXT_EXTENSIONS.test(file.name)) return "text";
  return null;
}

const readAs = (file: Blob, how: "dataUrl" | "text") =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    if (how === "dataUrl") reader.readAsDataURL(file);
    else reader.readAsText(file);
  });

const base64Of = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(",") + 1);

// A picture as the model gets it: at most MAX_IMAGE_SIDE on its longer side
async function readImage(file: File): Promise<Pick<ChatAttachment, "data" | "mediaType" | "width" | "height">> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(width, height));
  // Small enough (and not an animation): sent as it is
  if (scale === 1 && file.type !== "image/gif") {
    bitmap.close();
    return { data: base64Of(await readAs(file, "dataUrl")), mediaType: file.type, width, height };
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const mediaType = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
  return { data: base64Of(canvas.toDataURL(mediaType, 0.9)), mediaType, width, height };
}

export async function readAttachment(file: File, id: string): Promise<ChatAttachment> {
  const kind = kindOf(file);
  if (!kind) throw new AttachmentError("type", file.name);
  const limit = kind === "image" ? ATTACHMENT_LIMITS.imageBytes : kind === "pdf" ? ATTACHMENT_LIMITS.pdfBytes : ATTACHMENT_LIMITS.textBytes;
  if (file.size > limit) throw new AttachmentError("tooLarge", file.name);
  const base = { id, name: file.name, kind, size: file.size, file };
  try {
    if (kind === "image") return { ...base, ...(await readImage(file)), previewUrl: URL.createObjectURL(file) };
    if (kind === "pdf") return { ...base, mediaType: "application/pdf", data: base64Of(await readAs(file, "dataUrl")) };
    const text = await readAs(file, "text");
    return { ...base, mediaType: file.type || "text/plain", data: text.slice(0, ATTACHMENT_LIMITS.textChars) };
  } catch {
    throw new AttachmentError("unreadable", file.name);
  }
}

// How an attachment is listed for the model ("img-1: logo.png, picture 400×120")
export const describeAttachment = (a: ChatAttachment) =>
  `${a.id}: ${a.name}, ${a.kind === "image" ? `picture${a.width ? ` ${a.width}×${a.height}` : ""}` : a.kind === "pdf" ? "PDF" : "text file"}`;

// ---------------------------------------------------------------------------
// Putting an attached picture into the report
// ---------------------------------------------------------------------------

// Picture sources made from attachments (the AI may use them for images; web
// addresses it writes itself are refused, as one that fails stops the PDF)
const madeFromAttachments = new Set<string>();
export const isAttachmentSource = (source: string) => madeFromAttachments.has(source);

// The image source of an attachment: stored like an uploaded picture (or a
// data URL when no upload service is set up); the same picture is stored once
const stored = new Map<File, Promise<string>>();
export function attachmentImageSource(attachment: ChatAttachment): Promise<string> {
  let pending = stored.get(attachment.file);
  if (!pending) {
    pending = resolveImageSource(attachment.file).then((source) => {
      madeFromAttachments.add(source);
      return source;
    });
    pending.catch(() => stored.delete(attachment.file));
    stored.set(attachment.file, pending);
  }
  return pending;
}
