<template>
  <!-- The report server's default templates (Report Definitions): read only,
       never renamed or deleted here. Drawn by the same cards / table as the
       user's own templates (kind "default"), following the page's one Grid
       / List switch (top of the Templates page): Open (or a click) shows one in the designer; Duplicate (asked
       first) has the server copy it into Templates (POST /v2/reports/copy) -->
  <section v-if="shown" class="default-templates" :data-help="isDefault ? 'default-templates' : undefined">
    <div class="section-head">
      <div>
        <h2>
          {{ t(`${textsKey}.title`) }}
          <span v-if="total" class="count">{{ total }}</span>
        </h2>
        <p class="hint">{{ t(`${textsKey}.hint`) }}</p>
      </div>
    </div>

    <div v-if="isError" class="load-failed" role="alert">
      <span>
        {{ t(`${textsKey}.loadFailed`) }}
        <small v-if="reason">{{ reason }}</small>
      </span>
      <button type="button" @click="refetch">{{ t("myTemplates.tryAgain") }}</button>
    </div>

    <template v-else-if="view === 'grid'">
      <TemplateGrid
        :kind="isDefault ? 'default' : 'server'"
        :templates="gridItems"
        :owner="t('reportCatalog.defaultTemplates.owner')"
        :skeletons="gridSkeletons"
      />
      <div v-if="grid.hasNextPage.value && !grid.isFetching.value" class="show-more">
        <button type="button" @click="grid.fetchNextPage()">
          <ChevronDown :size="15" :stroke-width="2.25" aria-hidden="true" />
          {{ t("reportCatalog.defaultTemplates.showMore", { shown: gridItems.length, total }) }}
        </button>
      </div>
    </template>

    <template v-else>
      <TemplateList
        :kind="isDefault ? 'default' : 'server'"
        :templates="listItems"
        :owner="t('reportCatalog.defaultTemplates.owner')"
        :sort="listSort"
        :dir="listDir"
        :skeletons="list.isPending.value ? 4 : 0"
        @sort="sortList"
      />
      <PageNavigation
        v-if="total > DEFAULT_TEMPLATE_PAGE_SIZE"
        class="pagination"
        :page="listPage"
        :page-size="DEFAULT_TEMPLATE_PAGE_SIZE"
        :total="total"
        @update:page="listPage = $event"
      />
    </template>

  </section>
</template>

<script setup lang="ts">
// The report server's templates on the Templates page (rptadn_TenantReport):
// the default ones (isDefault, the first section) or the tenant's own
// (isDefault false, "Templates"); only isDefault is sent as a filter. Grid: A to Z, a page at a time ("Show more"). List: pages,
// the Name / Last edited / Created headings sort (the server sorts). Hidden
// when there are none (and no failure to show).
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/vue-query";
import { ChevronDown } from "@lucide/vue";
import { defaultTemplateGridQuery, defaultTemplatePageQuery } from "@/queries/reportCatalogQueries";
import { DEFAULT_TEMPLATE_PAGE_SIZE } from "@/constants/reportCatalogConstants";
import { chosenTemplateView } from "@/composables/useTemplates";
import { useReportServerError } from "@/composables/useReportServerError";
import type { ReportDefinitionSort, ReportDefinitionSummary } from "@/types/reportCatalog";
import type { TemplateCard, TemplateSort, TemplateSortDirection } from "@/types/template";
import TemplateGrid from "./TemplateGrid.vue";
import TemplateList from "./TemplateList.vue";
import PageNavigation from "@/components/common/PageNavigation.vue";

// The list's columns as the server's sort fields
const SERVER_SORT: Record<TemplateSort, ReportDefinitionSort> = {
  name: "name",
  lastModified: "lastModifiedDate",
  createdAt: "createdDate",
};

const props = withDefaults(defineProps<{ isDefault?: boolean }>(), { isDefault: true });
const { t } = useI18n();
const route = useRoute();
// The section's title, hint and failure texts
const textsKey = computed(() => (props.isDefault ? "reportCatalog.defaultTemplates" : "reportCatalog.serverTemplates"));

// Grid / List: the page's one switch (the address's ?view=)
const view = computed(() => chosenTemplateView(route.query.view));

// A definition as the cards and the list show it: its creator on the server as the owner
const toCard = (item: ReportDefinitionSummary): TemplateCard => ({ ...item, owner: item.createdBy || undefined });

// Grid: A to Z, pages added with "Show more"
const grid = useInfiniteQuery(
  computed(() => ({
    ...defaultTemplateGridQuery(
      { isDefault: props.isDefault, sort: "name", dir: "asc" },
      DEFAULT_TEMPLATE_PAGE_SIZE,
    ),
    enabled: view.value === "grid",
  })),
);
const gridItems = computed(() => grid.data.value?.pages.flatMap((page) => page.items).map(toCard) ?? []);
const gridTotal = computed(() => {
  const pages = grid.data.value?.pages ?? [];
  return pages[pages.length - 1]?.total ?? 0;
});
const gridSkeletons = computed(() =>
  grid.isPending.value
    ? 4
    : grid.isFetching.value && grid.hasNextPage.value
      ? Math.min(DEFAULT_TEMPLATE_PAGE_SIZE, gridTotal.value - gridItems.value.length)
      : 0,
);

// List: one page, sorted by a heading click
const listSort = ref<TemplateSort>("name");
const listDir = ref<TemplateSortDirection>("asc");
const listPage = ref(1);
const list = useQuery(
  computed(() => ({
    ...defaultTemplatePageQuery({
      isDefault: props.isDefault,
      sort: SERVER_SORT[listSort.value],
      dir: listDir.value,
      page: listPage.value,
      size: DEFAULT_TEMPLATE_PAGE_SIZE,
    }),
    enabled: view.value === "list",
    placeholderData: keepPreviousData,
  })),
);
const listItems = computed(() => list.data.value?.items.map(toCard) ?? []);

function sortList(column: TemplateSort) {
  if (listSort.value === column) listDir.value = listDir.value === "asc" ? "desc" : "asc";
  else {
    listSort.value = column;
    listDir.value = column === "name" ? "asc" : "desc";
  }
  listPage.value = 1;
}

const active = computed(() => (view.value === "grid" ? grid : list));
const total = computed(() => (view.value === "grid" ? gridTotal.value : (list.data.value?.total ?? 0)));
const isError = computed(() => active.value.isError.value);
const reason = useReportServerError(computed(() => active.value.error.value));
const refetch = () => void active.value.refetch();
// Shown while loading, on a failure, or with templates to show
const shown = computed(
  () => active.value.isPending.value || isError.value || (view.value === "grid" ? gridItems.value : listItems.value).length > 0,
);
</script>

<style scoped>
.default-templates {
  margin-top: 26px;
}
.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}
h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #1c1b26;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.count {
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(100, 64, 244, 0.1);
  color: #6440f4;
  font-size: 11px;
  font-weight: 700;
}
.hint {
  margin: 4px 0 14px;
  color: #6e6a80;
  font-size: 12px;
}
.pagination {
  margin-top: 12px;
}
.load-failed {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid #fde2e2;
  border-radius: 10px;
  background: #fff7f7;
  color: #9b1c1c;
  font-size: 12px;
}
.load-failed small {
  display: block;
  margin-top: 3px;
  color: #8a84a3;
  font-size: 11px;
}
.load-failed button,
.show-more button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #ffffff;
  color: #45425a;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.load-failed button:hover,
.show-more button:hover {
  border-color: rgba(124, 92, 247, 0.45);
  color: #6440f4;
}
.show-more {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}
</style>
