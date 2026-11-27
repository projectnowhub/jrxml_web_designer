// cdp-fe-app Entities/shared/file-tag.types.ts
export interface Tag {
  id?: string;
  name: string;
}

export interface FileTag {
  id: string;
  response?: unknown;
  fileRef: string | { fileName: string; path: string; storageName: string };
  name: string;
  type: string;
  size?: number;
  createdDate?: string;
  createdBy?: string;
  tags: Tag[];
  metadata?: {
    photoTakenAt?: string | null;
    latitude?: number;
    longitude?: number;
  } | null;
}
