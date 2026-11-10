<template>
  <div class="home-content">
    <div class="content-heading">
      <div>
        <span class="eyebrow">{{ t("home.eyebrow") }}</span>
        <h1>{{ greeting }}</h1>
        <p>{{ t("reportCatalog.templates.subtitle") }}</p>
      </div>
      <div class="heading-tools">
        <!-- Grid / List for every list on the page (default templates and the user's own) -->
        <div class="view-toggle" data-help="template-view" role="radiogroup" :aria-label="t('myTemplates.view')">
          <button
            v-for="option in VIEWS"
            :key="option"
            type="button"
            role="radio"
            :aria-checked="view === option"
            :class="{ active: view === option }"
            :title="t(`myTemplates.views.${option}`)"
            :aria-label="t(`myTemplates.views.${option}`)"
            @click="setView(option)"
          >
            <component :is="option === 'grid' ? LayoutGrid : List" :size="16" :stroke-width="2.25" />
          </button>
        </div>
        <button type="button" class="primary-button" data-help="create-report" @click="createOpen = true">
          <Plus :size="16" :stroke-width="2.5" aria-hidden="true" />
          {{ t("reportCatalog.templates.create") }}
        </button>
      </div>
    </div>

    <!-- The report server's default templates (read only): open = the
         user's own copy -->
    <DefaultTemplateSection />

    <!-- Every template saved in this browser: Grid / List, open (edit),
         rename, duplicate, delete (My Templates' list) -->
    <h2 class="list-heading">{{ t("reportCatalog.templates.yours") }}</h2>
    <MyTemplatesView embedded class="template-list" />

    <CreateReportModal v-model:visible="createOpen" />
  </div>
</template>

<script setup lang="ts">
// Templates (home): a greeting, Create template (a popup asking project,
// template name and code; it then opens the new template in the designer),
// the report server's default templates (read only: opening one starts the
// user's own copy) and every template saved in this browser, with My Templates' Grid / List,
// order, paging and actions.
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { LayoutGrid, List, Plus } from "@lucide/vue";
import { TEMPLATE_VIEW_KEY, chosenTemplateView } from "@/composables/useTemplates";
import { useHelpStore } from "@/stores/help";
import { useAuthStore } from "@/stores/auth";
import MyTemplatesView from "./MyTemplatesView.vue";
import CreateReportModal from "@/components/reportCatalog/CreateReportModal.vue";
import DefaultTemplateSection from "@/components/templates/DefaultTemplateSection.vue";

const { t } = useI18n();
const auth = useAuthStore();

// "Good morning / afternoon / evening, Name" by the time of day, as the CDP
// app's welcome header; set when the page opens
const hour = new Date().getHours();
const greetingKey = hour < 12 ? "home.greetingMorning" : hour < 17 ? "home.greetingAfternoon" : "home.greetingEvening";
const greeting = computed(() =>
  auth.firstName ? t(greetingKey, { name: auth.firstName }) : t(`${greetingKey}Plain`),
);

const createOpen = ref(false);

// The page's one Grid / List switch: in the address (?view=) and remembered
const VIEWS = ["grid", "list"] as const;
const route = useRoute();
const router = useRouter();
const view = computed(() => chosenTemplateView(route.query.view));
function setView(option: (typeof VIEWS)[number]) {
  try {
    localStorage.setItem(TEMPLATE_VIEW_KEY, option);
  } catch {
    // Remembering is only a convenience
  }
  const { page: _page, defaultView: _old, ...rest } = route.query;
  router.replace({ query: { ...rest, view: option } });
}

// First visit: a short tour of the home page (once per browser)
const help = useHelpStore();
let tourTimer: ReturnType<typeof setTimeout> | undefined;
onMounted(() => {
  tourTimer = setTimeout(() => help.startTourOnce("home"), 600);
});
onBeforeUnmount(() => {
  clearTimeout(tourTimer);
  if (help.tourId === "home") help.endTour();
});
</script>

<style scoped>
.content-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: end;
  gap: 20px 30px;
}
.content-heading .eyebrow {
  color: #6440f4;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.content-heading h1 {
  margin: 10px 0 7px;
  font-size: clamp(25px, 3vw, 35px);
  letter-spacing: -0.035em;
}
.content-heading p {
  margin: 0;
  color: #6e6a80;
  font-size: 13px;
}
.heading-tools {
  display: flex;
  align-items: center;
  gap: 12px;
}
.view-toggle {
  display: inline-flex;
  padding: 3px;
  border-radius: 9px;
  background: #f1f0f6;
}
.view-toggle button {
  display: grid;
  place-items: center;
  width: 32px;
  height: 28px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: #8a84a3;
  cursor: pointer;
}
.view-toggle button:hover {
  color: #6440f4;
}
.view-toggle button.active {
  background: #ffffff;
  color: #6440f4;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.12);
}
.primary-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 15px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #7c5cf7, #6440f4);
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(100, 64, 244, 0.22);
}
.list-heading {
  margin: 28px 0 0;
  color: #1c1b26;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.template-list {
  margin-top: 6px;
}
</style>
