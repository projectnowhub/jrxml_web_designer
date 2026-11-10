<template>
  <section class="reports-view">
    <span class="eyebrow">{{ t("pages.workspace") }}</span>
    <h1>{{ t("reportCatalog.reports.title") }}</h1>
    <p>{{ t("reportCatalog.reports.subtitle") }}</p>

    <div class="list-bar">
      <span v-if="query" class="search-note">
        {{ t("reportCatalog.reports.resultsFor", { query }) }}
        <button type="button" class="clear-search" @click="setQuery({ q: undefined })">
          <X :size="13" :stroke-width="2.5" aria-hidden="true" />
          {{ t("myTemplates.clearSearch") }}
        </button>
      </span>
      <div class="bar-tools">
        <span class="count">{{ t("reportCatalog.reports.count", { count: shown.length }, shown.length) }}</span>
        <PageSizeChoice :model-value="pageSize" :sizes="REPORTS_PAGE_SIZES" @update:model-value="choosePageSize" />
        <button type="button" class="refresh" :title="t('reportCatalog.reports.refresh')" @click="reports.refetch()">
          <RefreshCw :size="15" :stroke-width="2.25" :class="{ spin: reports.isFetching.value }" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div v-if="reports.isError.value" class="load-failed" role="alert">
      <span class="failed-text">
        {{ t("reportCatalog.reports.loadFailed") }}
        <small v-if="failReason">{{ failReason }}</small>
      </span>
      <button type="button" @click="reports.refetch()">{{ t("myTemplates.tryAgain") }}</button>
    </div>

    <template v-else-if="pageItems.length || reports.isPending.value">
      <div class="report-table-wrap">
        <table class="report-table">
          <thead>
            <tr>
              <th class="col-name" :aria-sort="dir === 'asc' ? 'ascending' : 'descending'">
                <button type="button" class="sort-head active" @click="flipOrder">
                  {{ t("reportCatalog.reports.columns.name") }}
                  <component :is="dir === 'asc' ? ArrowUp : ArrowDown" :size="13" :stroke-width="2.25" aria-hidden="true" />
                </button>
              </th>
              <th>{{ t("reportCatalog.reports.columns.code") }}</th>
              <th>{{ t("reportCatalog.reports.columns.project") }}</th>
              <th class="col-actions">{{ t("reportCatalog.reports.columns.actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="report in pageItems"
              :key="report.id"
              class="report-row"
              tabindex="0"
              @click="openRun(report)"
              @keydown.enter.self="openRun(report)"
            >
              <td class="col-name">
                <span class="name-cell">
                  <span class="file-icon"><FileChartColumn :size="16" :stroke-width="2.25" aria-hidden="true" /></span>
                  <strong>{{ report.name || report.code || report.id }}</strong>
                </span>
              </td>
              <td>{{ report.code || "—" }}</td>
              <td>{{ report.projectName || "—" }}</td>
              <td class="col-actions">
                <button type="button" class="preview-button" @click.stop="openRun(report)" @keydown.enter.stop>
                  <Play :size="14" :stroke-width="2.5" aria-hidden="true" />
                  {{ t("reportCatalog.reports.preview") }}
                </button>
              </td>
            </tr>
            <template v-if="reports.isPending.value">
              <tr v-for="n in 6" :key="'skeleton-' + n" aria-hidden="true">
                <td class="col-name"><i class="skeleton-line wide" /></td>
                <td><i class="skeleton-line" /></td>
                <td><i class="skeleton-line" /></td>
                <td class="col-actions" />
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <PageNavigation
        v-if="pageItems.length"
        class="pagination"
        :page="page"
        :page-size="pageSize"
        :total="shown.length"
        @update:page="goToPage"
      />
    </template>

    <div v-else class="no-match">
      <template v-if="query">
        <SearchX :size="28" :stroke-width="2" aria-hidden="true" />
        <strong>{{ t("reportCatalog.reports.noMatch", { query }) }}</strong>
        <span>{{ t("myTemplates.noMatchHint") }}</span>
      </template>
      <template v-else>
        <FileChartColumn :size="28" :stroke-width="2" aria-hidden="true" />
        <strong>{{ t("reportCatalog.reports.empty") }}</strong>
        <span>{{ t("reportCatalog.reports.emptyHint") }}</span>
        <button type="button" class="go-templates" @click="router.push({ name: 'home' })">
          {{ t("reportCatalog.reports.goToTemplates") }}
        </button>
      </template>
    </div>

    <ReportRunModal v-model:visible="runOpen" :report="runReport" />
  </section>
</template>

<script setup lang="ts">
// Reports: the Jmix reports on the report server (made from its templates on
// the Templates page). Jmix Reports REST gives the whole list at once, so it
// is searched (the top bar's search, ?q=), ordered by name and paged here.
// Preview (or a row click) asks what the report needs and runs it.
import { computed, ref, watch } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useRoute, useRouter, type LocationQueryRaw } from "vue-router";
import { useI18n } from "vue-i18n";
import { ArrowDown, ArrowUp, FileChartColumn, Play, RefreshCw, SearchX, X } from "@lucide/vue";
import { reportListQuery } from "@/queries/reportCatalogQueries";
import { useReportServerError } from "@/composables/useReportServerError";
import { REPORTS_PAGE_SIZE, REPORTS_PAGE_SIZES } from "@/constants/reportCatalogConstants";
import type { JmixReportInfo } from "@/types/reportCatalog";
import ReportRunModal from "@/components/reportCatalog/ReportRunModal.vue";
import PageSizeChoice from "@/components/common/PageSizeChoice.vue";
import PageNavigation from "@/components/common/PageNavigation.vue";

const PAGE_SIZE_KEY = "reports.pageSize";

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();

const text = (value: unknown) => (typeof value === "string" ? value : "");
const query = computed(() => text(route.query.q).trim());
const dir = computed(() => (text(route.query.dir) === "desc" ? "desc" : "asc"));
const page = computed(() => Math.max(1, parseInt(text(route.query.page), 10) || 1));

const storedSize = (() => {
  try {
    return Number(localStorage.getItem(PAGE_SIZE_KEY));
  } catch {
    return 0;
  }
})();
const pageSize = ref<number>((REPORTS_PAGE_SIZES as readonly number[]).includes(storedSize) ? storedSize : REPORTS_PAGE_SIZE);

function setQuery(change: Record<string, string | number | undefined>) {
  const next: LocationQueryRaw = { ...route.query };
  for (const [key, value] of Object.entries(change)) {
    if (value === undefined || value === "") delete next[key];
    else next[key] = String(value);
  }
  router.replace({ query: next });
}

const flipOrder = () => setQuery({ dir: dir.value === "asc" ? "desc" : undefined, page: undefined });
function goToPage(number: number) {
  setQuery({ page: number > 1 ? number : undefined });
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function choosePageSize(size: number) {
  pageSize.value = size;
  try {
    localStorage.setItem(PAGE_SIZE_KEY, String(size));
  } catch {
    // Remembering is only a convenience
  }
  setQuery({ page: undefined });
}

const reports = useQuery(reportListQuery());
const failReason = useReportServerError(reports.error);

// Every word in the name or code, any case; ordered by name
const label = (report: JmixReportInfo) => report.name || report.code || report.id;
const shown = computed(() => {
  const words = query.value.toLowerCase().split(/\s+/).filter(Boolean);
  const sign = dir.value === "asc" ? 1 : -1;
  return (reports.data.value ?? [])
    .filter((report) => {
      const haystack = `${report.name ?? ""} ${report.code ?? ""}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    })
    .sort((a, b) => sign * label(a).localeCompare(label(b), locale.value, { numeric: true, sensitivity: "base" }));
});
const pageItems = computed(() => shown.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));

// A page past the end (a shorter list after a search) goes back to the last one
watch(
  () => [shown.value.length, pageSize.value] as const,
  ([count]) => {
    const last = Math.max(1, Math.ceil(count / pageSize.value));
    if (reports.isSuccess.value && page.value > last) setQuery({ page: last > 1 ? last : undefined });
  },
);

const runOpen = ref(false);
const runReport = ref<JmixReportInfo | null>(null);
// Reports kept in this browser open their template in the designer; server
// reports (when the APIs work) are run in the popup
function openRun(report: JmixReportInfo) {
  if (report.templateId) {
    router.push({ name: "designer", params: { id: report.templateId } });
    return;
  }
  runReport.value = report;
  runOpen.value = true;
}
</script>

<style scoped>
.reports-view {
  width: 100%;
}
.eyebrow {
  color: #6440f4;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
h1 {
  margin: 10px 0 7px;
  color: #1c1b26;
  font-size: clamp(25px, 3vw, 35px);
}
p {
  margin: 0;
  color: #6e6a80;
  font-size: 13px;
}
.list-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  min-height: 34px;
  margin: 28px 0 16px;
}
.search-note {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #45425a;
  font-size: 12.5px;
  font-weight: 600;
}
.clear-search {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border: 1px solid #e6e5ee;
  border-radius: 999px;
  background: #ffffff;
  color: #6e6a80;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.bar-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}
.count {
  color: #6f6a7e;
  font-size: 11.5px;
  white-space: nowrap;
}
.refresh {
  display: grid;
  place-items: center;
  width: 30px;
  height: 28px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #ffffff;
  color: #6e6a80;
  cursor: pointer;
}
.refresh:hover {
  border-color: #6440f4;
  color: #6440f4;
}
.report-table-wrap {
  overflow-x: auto;
  border: 1px solid rgba(28, 27, 38, 0.09);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.05);
}
.report-table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  font-size: 12.5px;
}
th,
td {
  padding: 0 14px;
  text-align: left;
  white-space: nowrap;
}
th {
  height: 42px;
  border-bottom: 1px solid #e6e5ee;
  background: #fafafc;
  color: #6e6a80;
  font-size: 11.5px;
  font-weight: 600;
}
td {
  height: 52px;
  border-bottom: 1px solid #f0eff5;
  color: #6e6a80;
}
tbody tr:last-child td {
  border-bottom: 0;
}
.col-name {
  width: 50%;
}
.col-actions {
  width: 1%;
  text-align: right;
}
.sort-head {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 6px;
  margin-left: -6px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: #1c1b26;
  font: inherit;
  cursor: pointer;
}
.sort-head:hover {
  background: rgba(124, 92, 247, 0.08);
  color: #6440f4;
}
.report-row {
  cursor: pointer;
  transition: background 0.14s ease;
}
.report-row:hover,
.report-row:focus-visible {
  background: rgba(124, 92, 247, 0.05);
  outline: none;
}
.name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.name-cell strong {
  overflow: hidden;
  text-overflow: ellipsis;
  color: #1c1b26;
  font-weight: 600;
}
.file-icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(124, 92, 247, 0.1);
  color: #6440f4;
}
.preview-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 11px;
  border: 0;
  border-radius: 7px;
  background: #6440f4;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.preview-button:hover {
  background: #5530e0;
}
.pagination {
  margin-top: 12px;
}
.load-failed {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(229, 72, 77, 0.3);
  border-radius: 10px;
  background: rgba(229, 72, 77, 0.06);
  color: #b4262b;
  font-size: 12.5px;
}
.failed-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.failed-text small {
  color: #8a2a2e;
  font-size: 11.5px;
  word-break: break-word;
}
.load-failed button,
.go-templates {
  padding: 7px 12px;
  border: 0;
  border-radius: 8px;
  background: #6440f4;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.go-templates {
  margin-top: 8px;
}
.no-match {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 40px 16px;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 10px;
  background: #fafafc;
  color: #8172d7;
  text-align: center;
}
.no-match strong {
  color: #1c1b26;
  font-size: 12.5px;
  font-weight: 600;
}
.no-match span {
  color: #8a84a3;
  font-size: 11px;
}
.skeleton-line {
  display: block;
  width: 60%;
  height: 9px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f1f0f6 25%, #f8f7fc 50%, #f1f0f6 75%);
  background-size: 200% 100%;
  animation: skeleton-shine 1.2s ease-in-out infinite;
}
.skeleton-line.wide {
  width: 45%;
}
.spin {
  animation: spin 0.9s linear infinite;
}
@keyframes skeleton-shine {
  to {
    background-position: -200% 0;
  }
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton-line,
  .spin {
    animation: none;
  }
}
</style>
