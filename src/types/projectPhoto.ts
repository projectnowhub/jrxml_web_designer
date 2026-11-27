// A project's photos (services/photoService.ts), as the CDP app's Photos page
// asks for them (project-shell usePhotos.ts / project.api.ts getProjectImages).
import type { FileTag } from "./entities/fileTag";

// Which date the period filters on: uploaded or taken
export type PhotoDateKind = "uploadedAt" | "photoTakenAt";

// The quick periods of the filter bar ("custom" = the From / To dates)
export type PhotoPeriod = "all" | "today" | "7d" | "15d" | "1m" | "3m" | "6m" | "custom";

// The request body (the CDP app's PhotoFilters): days as yyyy-MM-dd, tags by name
export interface ProjectPhotoFilter {
  startDate: string | null;
  endDate: string | null;
  tags: string[];
  filterByDate: PhotoDateKind;
}

// One page of photos
export interface ProjectPhotoPage {
  id?: string;
  data: FileTag[];
  total: number;
}

// The picture chooser's answer: what the image element stores (a fileRef, or a
// data URI without an upload server) and the file's name
export interface ChosenPicture {
  source: string;
  name: string;
}

// What the photos query is keyed by
export interface ProjectPhotoQuery {
  projectId: string;
  filter: ProjectPhotoFilter;
  // From 1, as the CDP app's `offset`
  page: number;
  size: number;
}
