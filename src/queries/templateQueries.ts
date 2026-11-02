// The template lists (home page, My Templates, the Open window) and opening a
// template, through TanStack Query. templateService.ts answers from this
// browser until the templates API exists. Saving or deleting templates calls
// invalidateTemplates, so every list on screen fetches again.

import { infiniteQueryOptions, queryOptions } from "@tanstack/vue-query";
import { getTemplate, listTemplates } from "@/services/templateService";
import type { TemplateQuery } from "@/types/template";
import { queryClient } from "./queryClient";
import { templateKeys } from "./queryKeys";

// One page (the List view's pages, the home page's latest, the Open window)
export const templateListQuery = (query: TemplateQuery) =>
  queryOptions({
    queryKey: templateKeys.list(query),
    queryFn: () => listTemplates(query),
  });

// The Grid view: pages of `size` added while scrolling
export const templateGridQuery = (query: Omit<TemplateQuery, "page" | "size">, size: number) =>
  infiniteQueryOptions({
    queryKey: templateKeys.infinite({ ...query, size }),
    queryFn: ({ pageParam }) => listTemplates({ ...query, page: pageParam, size }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      allPages.reduce((sum, p) => sum + p.items.length, 0) < lastPage.total ? allPages.length + 1 : undefined,
  });

// A whole template, for opening it (null: not found); always read fresh
export const fetchTemplate = (id: string) =>
  queryClient.fetchQuery({
    queryKey: templateKeys.detail(id),
    queryFn: async () => (await getTemplate(id)) ?? null,
    staleTime: 0,
  });

// Templates saved, renamed, copied or deleted: the lists fetch again
export const invalidateTemplates = () => queryClient.invalidateQueries({ queryKey: templateKeys.all });
