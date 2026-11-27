// Stored files shown in the app (the user's avatar), as the CDP app's
// useFileUrl: fetched once with the login and kept as an object URL for the
// visit (a file under a fileRef never changes).
import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { queryOptions, useQuery } from "@tanstack/vue-query";
import { getFileBlob } from "@/services/imageService";
import { toFileRefParam } from "@/services/helpers/fileRefHelpers";
import type { FileRef } from "@/types/entities/fileRef";
import { fileKeys } from "./queryKeys";

export const fileUrlQuery = (fileRef: string) =>
  queryOptions({
    queryKey: fileKeys.blob(fileRef),
    queryFn: async () => URL.createObjectURL(await getFileBlob(fileRef)),
    staleTime: Infinity,
    enabled: !!fileRef,
  });

// The file's displayable URL, or null while there is none (no file, loading, failed)
export function useFileUrl(fileRef: MaybeRefOrGetter<FileRef | null | undefined>) {
  const query = useQuery(computed(() => fileUrlQuery(toFileRefParam(toValue(fileRef)))));
  return computed(() => query.data.value ?? null);
}
