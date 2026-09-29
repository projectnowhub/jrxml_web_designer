import apiClient, { ApiError } from "./apiClient";
import { IMAGE_UPLOAD_API } from "@/config/apiConfig";

export const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg"];

export type ImageUploadErrorCode = "INVALID_FORMAT" | "TOO_LARGE" | "UPLOAD_FAILED";

// Translation keys (under "imageUpload") for each error; the UI shows t(messageKey, params)
const ERROR_MESSAGE_KEYS: Record<ImageUploadErrorCode, string> = {
  INVALID_FORMAT: "imageUpload.invalidFormat",
  TOO_LARGE: "imageUpload.tooLarge",
  UPLOAD_FAILED: "imageUpload.uploadFailed",
};

export class ImageUploadError extends Error {
  readonly code: ImageUploadErrorCode;
  readonly messageKey: string;
  readonly params: Record<string, string | number>;

  // `message` is the English text kept for logs; users see the translated messageKey
  constructor(
    code: ImageUploadErrorCode,
    message: string,
    params: Record<string, string | number> = {},
    messageKey = ERROR_MESSAGE_KEYS[code],
  ) {
    super(message);
    this.name = "ImageUploadError";
    this.code = code;
    this.messageKey = messageKey;
    this.params = params;
  }
}

const hasAllowedTypeOrExtension = (file: File): boolean => {
  if (file.type && ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) return true;
  const name = file.name ? file.name.toLowerCase() : "";
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
};

// Checks the real file signature, so a renamed file (e.g. .exe -> .png) is rejected
const hasImageSignature = async (file: File): Promise<boolean> => {
  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const isPng =
    header.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => header[i] === b);
  const isJpeg =
    header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  return isPng || isJpeg;
};

export async function validateImageFile(file: File): Promise<void> {
  if (!hasAllowedTypeOrExtension(file) || !(await hasImageSignature(file))) {
    throw new ImageUploadError(
      "INVALID_FORMAT",
      "You cannot upload this file, image format does not support",
    );
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const size = (file.size / 1024 / 1024).toFixed(1);
    throw new ImageUploadError(
      "TOO_LARGE",
      `Image is too large (${size} MB). Maximum size is 4 MB.`,
      { size },
      "imageUpload.tooLargeWithSize",
    );
  }
}

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(
        new ImageUploadError(
          "INVALID_FORMAT",
          "You cannot upload this file, image format does not support",
        ),
      );
    reader.readAsDataURL(file);
  });

// The files API answers { fileRef: "hetzner-s3://...", name, size }; plain URL shapes are also accepted
const extractUrl = (body: unknown): string | null => {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const nested =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : {};
  const url =
    record.fileRef ??
    record.url ??
    record.imageUrl ??
    record.location ??
    nested.fileRef ??
    nested.url ??
    nested.imageUrl;
  return typeof url === "string" && url ? url : null;
};

// A storage reference such as "hetzner-s3://2026/09/29/<id>.jpeg?name=...". Browsers can't
// load these, so the canvas resolves them to a displayable URL via resolveFileRefDisplayUrl().
export const isFileRef = (source: string): boolean =>
  /^[a-z][a-z0-9+.-]*:\/\//i.test(source) && !/^(https?|blob|file):/i.test(source);

// fileRef -> object URL, shared by every image element showing the same stored file
const displayUrlCache = new Map<string, Promise<string>>();

const rememberLocalImage = (fileRef: string, file: File): void => {
  displayUrlCache.set(fileRef, Promise.resolve(URL.createObjectURL(file)));
};

// Downloads a stored image (with auth headers, which <img src> can't send) and returns an object URL
export function resolveFileRefDisplayUrl(fileRef: string): Promise<string> {
  const cached = displayUrlCache.get(fileRef);
  if (cached) return cached;

  if (!IMAGE_UPLOAD_API) {
    return Promise.reject(new Error("VITE_IMAGE_UPLOAD_API is not configured"));
  }

  const url = IMAGE_UPLOAD_API.includes("{fileRef}")
    ? IMAGE_UPLOAD_API.replace("{fileRef}", encodeURIComponent(fileRef))
    : `${IMAGE_UPLOAD_API}${IMAGE_UPLOAD_API.includes("?") ? "&" : "?"}fileRef=${encodeURIComponent(fileRef)}`;

  const pending = apiClient
    .get<Blob>(url, { responseType: "blob" })
    .then((blob) => URL.createObjectURL(blob));
  // Don't cache failures, so a later render can retry
  pending.catch(() => displayUrlCache.delete(fileRef));
  displayUrlCache.set(fileRef, pending);
  return pending;
}

// Natural pixel size of an image file (EXIF orientation applied), or null if it can't be decoded
export async function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size.width > 0 && size.height > 0 ? size : null;
  } catch {
    return null;
  }
}

// Largest box with the image's aspect ratio that fits inside the current element box,
// so the frame hugs the picture (no empty bands, no distortion) and never grows past its band
export function fitBoxToImage(
  box: { width: number; height: number },
  image: { width: number; height: number },
): { width: number; height: number } {
  const scale = Math.min(box.width / image.width, box.height / image.height);
  return {
    width: Math.max(1, Math.round(image.width * scale)),
    height: Math.max(1, Math.round(image.height * scale)),
  };
}

// Resizes an image element to hug the uploaded picture. A 90°-rotated element shows the image
// with width and height swapped, so the image's aspect ratio is swapped to match.
export function fitElementToImage(
  element: { width: number; height: number; rotation?: string },
  image: { width: number; height: number } | null,
): void {
  if (!image) return;
  const quarterTurn = element.rotation === "Left" || element.rotation === "Right";
  const fitted = fitBoxToImage(
    element,
    quarterTurn ? { width: image.height, height: image.width } : image,
  );
  element.width = fitted.width;
  element.height = fitted.height;
}

// Sends the image as binary (multipart/form-data) and returns the stored image reference
export async function uploadImage(file: File, signal?: AbortSignal): Promise<string> {
  const form = new FormData();
  form.append("file", file, file.name);

  let body: unknown;
  try {
    body = await apiClient.post<unknown>(IMAGE_UPLOAD_API, form, { signal });
  } catch (error) {
    if (error instanceof ApiError && error.status === 413) {
      throw new ImageUploadError("TOO_LARGE", "Image is too large. Maximum size is 4 MB.");
    }
    throw new ImageUploadError(
      "UPLOAD_FAILED",
      error instanceof Error && error.message ? error.message : "Image upload failed",
    );
  }

  const url = extractUrl(body);
  if (!url) {
    throw new ImageUploadError(
      "UPLOAD_FAILED",
      "Upload response did not contain an image URL",
      {},
      "imageUpload.invalidResponse",
    );
  }
  // Show the just-uploaded file right away instead of downloading it back
  if (isFileRef(url)) rememberLocalImage(url, file);
  return url;
}

// Validates the file and returns the image source to store in imageExpression:
// the uploaded image link when an upload endpoint is configured, otherwise a base64 data URL.
export async function resolveImageSource(file: File, signal?: AbortSignal): Promise<string> {
  await validateImageFile(file);
  return IMAGE_UPLOAD_API ? uploadImage(file, signal) : readAsDataUrl(file);
}

// A quote would end the Java string literal; %22 keeps the URL valid for both the canvas and JasperReports
export const toImageExpression = (source: string): string => `"${source.replace(/"/g, "%22")}"`;
