// Picture upload types (POST /rest/files, services/imageService.ts).

export type ImageUploadErrorCode = "INVALID_FORMAT" | "TOO_LARGE" | "UPLOAD_FAILED";

// The files API answers { fileRef: "hetzner-s3://...", name, size }; other
// upload servers may name the link url / imageUrl / location
export interface FileUploadResponse {
  fileRef?: string;
  url?: string;
  imageUrl?: string;
  location?: string;
  name?: string;
  size?: number;
}
