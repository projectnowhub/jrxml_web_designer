// Project photos API: the calls the picture chooser makes, as the CDP app's
// Photos page (project-shell project.api.ts). Caching is TanStack Query's
// (queries/photoQueries.ts); a chosen photo is stored by its fileRef, like an
// uploaded picture (services/imageService.ts).
//
//   1. Photos  POST /v1/image/project/filter/{projectId}?offset&limit   postProjectPhotos
//   2. Tags    GET  /rest/entities/cdp_Tag                             getPhotoTags

import apiClient, { unwrap } from "./apiClient";
import { API_ROUTES } from "@/config/apiConfig";
import type { ApiResponse } from "@/types/api";
import type { Tag } from "@/types/entities/fileTag";
import type { ProjectPhotoFilter, ProjectPhotoPage } from "@/types/projectPhoto";

// 1. One page of a project's photos (`offset` is the page, from 1, as the CDP app sends it)
export async function postProjectPhotos(
  projectId: string,
  filter: ProjectPhotoFilter,
  page: number,
  size: number,
  signal?: AbortSignal,
): Promise<ProjectPhotoPage> {
  const path = `${API_ROUTES.projectPhotos}/${encodeURIComponent(projectId)}?offset=${page}&limit=${size}`;
  const body = await apiClient.post<ApiResponse<ProjectPhotoPage>>(path, JSON.stringify(filter), { signal });
  return unwrap(body);
}

// 2. Every photo tag
export async function getPhotoTags(signal?: AbortSignal): Promise<Tag[]> {
  const body = await apiClient.get<ApiResponse<Tag[]>>(API_ROUTES.photoTags, { signal });
  return unwrap(body);
}

export const photoApi = { postProjectPhotos, getPhotoTags };
