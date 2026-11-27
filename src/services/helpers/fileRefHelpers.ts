// A stored file's reference as GET /rest/files?fileRef= expects it (the CDP
// app's buildFileRef, core/api files/fileRef.ts): the backend sends a plain
// string or a storage descriptor ({ storageName, path, … }); an object passed
// as it is would be sent as "[object Object]". Makes no calls.
import type { FileRef } from "@/types/entities/fileRef";

export function toFileRefParam(fileRef: FileRef | null | undefined): string {
  if (!fileRef) return "";
  if (typeof fileRef === "string") return fileRef;
  if (!fileRef.path) return "";
  return `${fileRef.storageName ?? "fs"}://${fileRef.path}?name=`;
}
