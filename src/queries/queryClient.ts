// The one TanStack Query cache for every API read (projects, their details
// and table sources, table rows, chart numbers, templates), set up like the
// CDP app's (cdp-fe-app platform-shell/src/providers/QueryProvider.tsx).
// Components read through useQuery / useInfiniteQuery; code outside
// components (the AI assistant, printing, the JRXML writer) through
// queryClient.fetchQuery with the same query options, so both share one cache.
// Keys come from queries/queryKeys.ts only.

import { MutationCache, QueryCache, QueryClient } from "@tanstack/vue-query";
import { ApiError } from "@/services/apiClient";
import type { ApiStatusDetail } from "@/types/api";

// Not worth retrying: the request itself is wrong (4xx), or it was cancelled
const isClientError = (error: Error) =>
  error instanceof ApiError && error.status !== undefined && error.status >= 400 && error.status < 500;

export const queryClient = new QueryClient({
  // A failed query, once its retries are used up, with its key and status
  queryCache: new QueryCache({
    onError(error, query) {
      const status = error instanceof ApiError && error.status ? ` ${error.status}` : "";
      console.error(`[Query Error] ${JSON.stringify(query.queryKey)}${status} — ${error.message}`);
    },
  }),
  mutationCache: new MutationCache({
    onError(error, _variables, _context, mutation) {
      const key = mutation.options.mutationKey ? ` ${JSON.stringify(mutation.options.mutationKey)}` : "";
      console.error(`[Mutation Error]${key} — ${error.message}`);
    },
  }),
  defaultOptions: {
    queries: {
      // Never retry 4xx (they keep failing); server errors and network
      // failures up to 2 times, 1 s → 2 s → 4 s … at most 30 s apart
      retry: (failureCount, error) => !isClientError(error) && failureCount < 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// The session ended (the API client's 401, sent as the "api:status" event):
// the cached data was that session's, so the next sign-in starts empty
window.addEventListener("api:status", (event) => {
  if ((event as CustomEvent<ApiStatusDetail>).detail?.status === 401) queryClient.clear();
});

// How long fetched data counts as fresh (the CDP app's project list: 5 minutes);
// Report Data's refresh button marks everything stale at once
export const DATA_STALE_TIME = 5 * 60 * 1000;
