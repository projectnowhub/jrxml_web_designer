// cdp-fe-app Entities/shared/file-ref.types.ts: a file reference as entity
// endpoints return it (e.g. AuthUser.avatar): a plain fileRef string or a
// storage descriptor; never a URL (resolve it via GET /rest/files?fileRef=)
export interface FileRefObject {
  storageName: string;
  path: string;
  fileName?: string;
  parameters?: Record<string, string>;
  contentType?: string;
}

export type FileRef = string | FileRefObject;
