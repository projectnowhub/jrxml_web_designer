<template>
  <div class="home-content">
    <div class="content-heading">
      <div>
        <span class="eyebrow">{{ t("home.eyebrow") }}</span>
        <h1>{{ t("home.greeting", { name: displayName }) }}</h1>
        <p>{{ t("home.subtitle") }}</p>
      </div>
    </div>
    <section class="section-block">
      <div class="section-heading">
        <h2>{{ t("home.recentTemplates") }}</h2>
        <button v-if="total > RECENT_COUNT" class="view-all" type="button" @click="router.push({ name: 'mytemplates' })">
          {{ t("home.viewAll") }} <ArrowRight :size="15" :stroke-width="2.25" />
        </button>
      </div>
      <TemplateGrid :templates="recent" :owner="displayName" show-new />
    </section>
    <!-- Hidden until templates can be shared -->
    <section v-if="SHOW_SHARED" class="section-block shared-section">
      <div class="section-heading">
        <h2>{{ t("home.sharedWithYou") }}</h2>
        <span class="muted-label">{{ t("home.recentlyAccessed") }}</span>
      </div>
      <div class="empty-state">
        <div><Inbox :size="32" :stroke-width="2" /></div>
        <strong>{{ t("home.noSharedTemplates") }}</strong
        ><span>{{ t("home.noSharedTemplatesHint") }}</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ArrowRight, Inbox } from "@lucide/vue";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "../services/apiClient";
import { useQuery } from "@tanstack/vue-query";
import { templateListQuery } from "@/queries/templateQueries";
import TemplateGrid from "@/components/templates/TemplateGrid.vue";
import { useHelpStore } from "../stores/help";

const SHOW_SHARED = false;

const { t } = useI18n();
const router = useRouter();
const storedUser = JSON.parse(
  localStorage.getItem(AUTH_USER_KEY) ?? "{}",
) as {
  firstName?: string;
  name?: string;
  username?: string;
  email?: string;
};
const displayName = computed(
  () => storedUser.firstName ?? t("home.defaultUserName"),
);
// The 7 last edited templates; View all goes to My Templates
const RECENT_COUNT = 7;
// (a template renamed, copied or deleted here shows at once: saving invalidates the list)
const recentQuery = useQuery(templateListQuery({ size: RECENT_COUNT, sort: "lastModified", dir: "desc" }));
const recent = computed(() => recentQuery.data.value?.items ?? []);
const total = computed(() => recentQuery.data.value?.total ?? 0);

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
.eyebrow {
  display: inline-block;
  padding: 6px 10px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.18);
  border-radius: 999px;
  color: #6366f1;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 18px;
}

.content-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 30px;
}
.content-heading .eyebrow {
  display: inline;
  padding: 0;
  margin: 0;
  border: 0;
  background: none;
  color: #6440f4;
  font-size: 10px;
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
.primary-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 16px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #7c5cf7, #6366f1);
  color: white;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(99, 102, 241, 0.22);
}
.primary-button b {
  font-size: 18px;
  font-weight: 400;
  line-height: 12px;
}
.section-block {
  margin-top: 52px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.section-heading h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}
.view-all,
.muted-label {
  color: #6f6a7e;
  font-size: 11.5px;
}
.view-all {
  border: 0;
  background: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  transition: color 0.15s ease;
}
.view-all:hover {
  color: #6440f4;
}
.shared-section {
  margin-top: 54px;
}
.empty-state {
  min-height: 145px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 10px;
  background: #fafafc;
}
.empty-state > div {
  color: #8172d7;
  font-size: 30px;
  line-height: 25px;
}
.empty-state strong {
  font-size: 12.5px;
  font-weight: 600;
}
</style>
