// The CDP projects through TanStack Query (the CDP app's useProjectList /
// useInfiniteQuery pattern): the picker's list a page at a time, one project,
// and its details. Components use the hooks; the AI assistant, the Location
// panel and Report Data's details use the fetch functions, which read the
// same cache.

import { computed, toValue, watchEffect, type MaybeRefOrGetter } from "vue";
import { infiniteQueryOptions, queryOptions, useInfiniteQuery } from "@tanstack/vue-query";
import { reportDataApi } from "@/services/reportDataService";
import { projectKey, toProjectDetails, toProjectSummary } from "@/services/helpers/projectMappers";
import type { JmixListResponse } from "@/types/jmix";
import type { ProjectDetails, ProjectSummary, ProjectRecord } from "@/types/dataSource";
import { DATA_STALE_TIME, queryClient } from "./queryClient";
import { projectKeys } from "./queryKeys";

// A list page holds whole projects: it also answers for each project on it
// (choosing one fetches nothing)
function seedProjects(rows: ProjectRecord[]) {
  for (const project of rows) queryClient.setQueryData(projectKeys.detail(projectKey(project)), project);
}

// Search is done here in the browser, never by the API: every word must be in
// the project's name or code (any case)
export function matchesSearch(project: ProjectSummary, search: string): boolean {
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const text = `${project.name} ${project.code}`.toLowerCase();
  return words.every((word) => text.includes(word));
}

// The picker's list: pages of 30, the next one from where the loaded rows end
export const projectListQuery = () =>
  infiniteQueryOptions({
    queryKey: projectKeys.list(),
    queryFn: async ({ pageParam, signal }) => {
      const page = await reportDataApi.getProjectsPage({ offset: pageParam }, signal);
      seedProjects(page.rows);
      return page;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.reduce((sum, p) => sum + p.rows.length, 0) : undefined,
    staleTime: DATA_STALE_TIME,
  });

// One project by its id (null: no such project), taken from the list's pages:
// the picker's loaded pages (waiting for that request when it is on its way),
// else every page. No request of its own
export const projectQuery = (id: string) =>
  queryOptions({
    queryKey: projectKeys.detail(id),
    queryFn: async (): Promise<ProjectRecord | null> => {
      const list = await queryClient.fetchInfiniteQuery(projectListQuery());
      const loaded = list.pages.flatMap((page) => page.rows).find((project) => projectKey(project) === id);
      if (loaded) return loaded;
      // Every page already loaded: no such project
      if (!list.pages[list.pages.length - 1]?.hasMore) return null;
      return (await fetchAllProjects()).find((project) => projectKey(project) === id) ?? null;
    },
    staleTime: DATA_STALE_TIME,
  });

// The picker's first page, loaded as soon as the designer opens (as the CDP app
// prefetches its dashboards), so the list is there before the picker opens
export const prefetchProjects = (): Promise<void> => queryClient.prefetchInfiniteQuery(projectListQuery());

// The picker's list: every loaded page as one list of projects (a project that
// moved to a later page after a change is shown once), and those matching the
// search. While a search is typed, the remaining pages load one after another
// so it finds every project
export function useProjectList(search: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>) {
  const query = useInfiniteQuery(computed(() => ({ ...projectListQuery(), enabled: toValue(enabled) })));
  const projects = computed<ProjectSummary[]>(() => {
    const seen = new Set<string>();
    return (query.data.value?.pages ?? [])
      .flatMap((page) => page.rows)
      .filter((project) => {
        const key = projectKey(project);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(toProjectSummary);
  });
  const matching = computed(() => {
    const words = toValue(search);
    return words.trim() ? projects.value.filter((p) => matchesSearch(p, words)) : projects.value;
  });
  watchEffect(() => {
    if (!toValue(enabled) || !toValue(search).trim()) return;
    if (query.hasNextPage.value && !query.isFetching.value && !query.isError.value) query.fetchNextPage();
  });
  return { ...query, projects, matching };
}

// ---- Outside components (same cache) ---------------------------------------

export const fetchProject = (key: string): Promise<ProjectRecord | null> => queryClient.fetchQuery(projectQuery(key));

// A project's details for Report Data (throws for an unknown project)
export async function getProject(key: string): Promise<ProjectDetails> {
  const project = await fetchProject(key);
  if (!project) throw new Error(`Unknown project: ${key}`);
  return toProjectDetails(project, key);
}

// A project's name and code (a chosen project may not be on the pages loaded so far)
export async function getProjectSummary(key: string): Promise<ProjectSummary | null> {
  const project = await fetchProject(key);
  return project ? { ...toProjectSummary(project), id: key } : null;
}

// Every project, all pages (the AI assistant's search; a chosen project not
// on the picker's loaded pages)
function fetchAllProjects(): Promise<ProjectRecord[]> {
  return queryClient.fetchQuery({
    queryKey: projectKeys.everything(),
    queryFn: async ({ signal }) => {
      const rows: ProjectRecord[] = [];
      for (let more = true; more; ) {
        const page = await reportDataApi.getProjectsPage({ offset: rows.length }, signal);
        seedProjects(page.rows);
        rows.push(...page.rows);
        more = page.hasMore && page.rows.length > 0;
      }
      return rows;
    },
    staleTime: DATA_STALE_TIME,
  });
}

// Projects for the AI assistant: the first page, or every project matching a
// search (searched here, like the picker)
export async function listProjects({ search = "" }: { search?: string } = {}): Promise<JmixListResponse<ProjectSummary>> {
  if (!search.trim()) {
    const data = await queryClient.fetchInfiniteQuery(projectListQuery());
    const first = data.pages[0] ?? { rows: [], total: 0, hasMore: false };
    return { ...first, rows: first.rows.map(toProjectSummary) };
  }
  const rows = (await fetchAllProjects()).map(toProjectSummary).filter((p) => matchesSearch(p, search));
  return { rows, total: rows.length, hasMore: false };
}
