// A project's photos for the picture chooser (modals/PictureChooserModal.vue):
// a page at a time with its filters, and the tags to filter by. Fresh for a
// minute, as the CDP app's photo picker (useProjectPhotosForPicker).
import { queryOptions } from "@tanstack/vue-query";
import { getPhotoTags, postProjectPhotos } from "@/services/photoService";
import type { ProjectPhotoQuery } from "@/types/projectPhoto";
import { photoKeys } from "./queryKeys";

const PHOTO_STALE_TIME = 60 * 1000;

export const projectPhotosQuery = (query: ProjectPhotoQuery) =>
  queryOptions({
    queryKey: photoKeys.page(query),
    queryFn: ({ signal }) => postProjectPhotos(query.projectId, query.filter, query.page, query.size, signal),
    staleTime: PHOTO_STALE_TIME,
    enabled: !!query.projectId,
  });

// `enabled` false = not yet (the chooser is closed)
export const photoTagsQuery = (enabled = true) =>
  queryOptions({
    queryKey: photoKeys.tags(),
    queryFn: ({ signal }) => getPhotoTags(signal),
    staleTime: PHOTO_STALE_TIME,
    enabled,
  });
