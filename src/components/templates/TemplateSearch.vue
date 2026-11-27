<template>
  <!-- The top bar's template search: as you type, the templates whose code
       contains the words (default and the tenant's own, first 100) in a list
       under the box; a click or Enter opens one. Actions stay in the lists. -->
  <div ref="rootRef" class="template-search" data-help="search">
    <label class="search-box">
      <Search :size="20" :stroke-width="2.25" aria-hidden="true" />
      <input
        ref="inputRef"
        v-model="text"
        type="search"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="open"
        aria-controls="template-search-results"
        :aria-activedescendant="active >= 0 ? `template-search-${active}` : undefined"
        :placeholder="t('layout.searchTemplates')"
        :aria-label="t('layout.searchTemplates')"
        @focus="open = !!text.trim()"
        @keydown="onKey"
      />
      <kbd>/</kbd>
    </label>

    <Transition name="menu-pop">
      <div
        v-if="open && (words || text.trim())"
        id="template-search-results"
        class="results"
        role="listbox"
        :aria-busy="loading"
      >
        <p v-if="tooShort" class="note">{{ t("layout.templateSearch.tooShort", { n: TEMPLATE_SEARCH_MIN_LETTERS }) }}</p>
        <!-- Searching: only skeleton rows (the last results are not shown) -->
        <template v-else-if="search.isPending.value || loading">
          <div v-for="n in 4" :key="n" class="row is-skeleton">
            <SkeletonBlock width="28px" height="28px" radius="8px" />
            <span class="skeleton-text">
              <SkeletonBlock :width="`${40 + n * 10}%`" />
              <SkeletonBlock width="30%" height="9px" />
            </span>
          </div>
        </template>
        <p v-else-if="search.isError.value" class="note is-error">{{ t("layout.templateSearch.failed") }}</p>
        <p v-else-if="!items.length" class="note">{{ t("layout.templateSearch.noMatch", { words }) }}</p>
        <template v-else>
          <button
            v-for="(item, index) in items"
            :id="`template-search-${index}`"
            :key="item.id"
            type="button"
            role="option"
            class="row"
            :class="{ active: index === active }"
            :aria-selected="index === active"
            @mouseenter="active = index"
            @click="openItem(item)"
          >
            <span class="row-icon"><LayoutTemplate :size="15" :stroke-width="2.25" aria-hidden="true" /></span>
            <span class="row-text">
              <strong>{{ item.name }}</strong>
              <small>{{ editedText(item) }}</small>
            </span>
            <span v-if="item.isDefault" class="default-badge">
              <Lock :size="11" :stroke-width="2.5" aria-hidden="true" />
              {{ t("reportCatalog.defaultTemplates.badge") }}
            </span>
          </button>
          <p v-if="total > items.length" class="note is-more">
            {{ t("layout.templateSearch.more", { shown: items.length, total }) }}
          </p>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useQuery } from "@tanstack/vue-query";
import { LayoutTemplate, Lock, Search } from "@lucide/vue";
import SkeletonBlock from "@/components/common/SkeletonBlock.vue";
import { templateSearchQuery } from "@/queries/reportCatalogQueries";
import { useTemplates } from "@/composables/useTemplates";
import { TEMPLATE_SEARCH_DELAY_MS, TEMPLATE_SEARCH_MIN_LETTERS } from "@/constants/reportCatalogConstants";
import type { ReportDefinitionSummary } from "@/types/reportCatalog";

const { t } = useI18n();
const { editedText, openDefaultTemplate } = useTemplates();

const rootRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const text = ref("");
// The words asked for: the typed text once typing pauses
const words = ref("");
const open = ref(false);
// The highlighted row (arrow keys, the pointer)
const active = ref(-1);

let timer: ReturnType<typeof setTimeout> | undefined;
// Debounced: every key typed restarts the wait; only when typing pauses for
// TEMPLATE_SEARCH_DELAY_MS do the words change (and the query asks, from
// TEMPLATE_SEARCH_MIN_LETTERS letters)
watch(text, (value) => {
  clearTimeout(timer);
  // The list opens at once, with skeleton rows until the answer comes
  open.value = !!value.trim();
  timer = setTimeout(() => {
    words.value = value.trim();
    active.value = -1;
  }, TEMPLATE_SEARCH_DELAY_MS);
});
// Too few letters to search yet
const tooShort = computed(() => text.value.trim().length < TEMPLATE_SEARCH_MIN_LETTERS);

const search = useQuery(
  computed(() => templateSearchQuery(words.value)),
);
const items = computed(() => search.data.value?.items ?? []);
// Searching: words typed and waiting for the pause, or the request on its way
// (skeleton rows only; the last results are not shown meanwhile)
const loading = computed(
  () => !tooShort.value && (text.value.trim() !== words.value || search.isFetching.value),
);
const total = computed(() => search.data.value?.total ?? 0);

// A template from the results: opened in the designer (the browser's copy of
// one made here, else the server's)
function openItem(item: ReportDefinitionSummary) {
  open.value = false;
  inputRef.value?.blur();
  void openDefaultTemplate(item);
}

function onKey(event: KeyboardEvent) {
  if (event.key === "Escape") {
    open.value = false;
    return;
  }
  if (!open.value || !items.value.length) {
    if (event.key === "ArrowDown" && words.value) open.value = true;
    return;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    active.value = (active.value + step + items.value.length) % items.value.length;
    document.getElementById(`template-search-${active.value}`)?.scrollIntoView({ block: "nearest" });
  } else if (event.key === "Enter") {
    event.preventDefault();
    const item = items.value[Math.max(0, active.value)];
    if (item) openItem(item);
  }
}

// A click outside closes the list
function onPressOutside(event: PointerEvent) {
  if (!rootRef.value?.contains(event.target as Node)) open.value = false;
}
// "/" (not while typing somewhere) puts the cursor in the search box
function onSlash(event: KeyboardEvent) {
  if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
  event.preventDefault();
  inputRef.value?.focus();
}
onMounted(() => {
  document.addEventListener("pointerdown", onPressOutside, true);
  document.addEventListener("keydown", onSlash);
});
onBeforeUnmount(() => {
  clearTimeout(timer);
  document.removeEventListener("pointerdown", onPressOutside, true);
  document.removeEventListener("keydown", onSlash);
});
</script>

<style scoped>
.template-search {
  position: absolute;
  left: 50%;
  width: min(570px, 38vw);
  transform: translateX(-50%);
}
.search-box {
  height: 42px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 12px 0 15px;
  border: 1px solid rgba(28, 27, 38, 0.12);
  border-radius: 11px;
  color: #8a84a3;
  background: #f2f3f9;
  box-sizing: border-box;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}
.search-box:focus-within {
  border-color: rgba(124, 92, 247, 0.5);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(124, 92, 247, 0.14);
}
.search-box input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  color: #1c1b26;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
}
.search-box input::placeholder {
  color: #9a94ab;
}
.search-box kbd {
  padding: 2px 7px;
  border: 1px solid rgba(28, 27, 38, 0.16);
  border-radius: 4px;
  color: #6f6a7e;
  font-size: 10px;
  font-weight: 600;
  font-family: inherit;
}
.results {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 50;
  max-height: min(420px, 60vh);
  overflow-y: auto;
  padding: 6px;
  border: 1px solid #e6e5ee;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 12px 32px rgba(23, 20, 44, 0.14);
}
.row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #1c1b26;
  text-align: left;
  cursor: pointer;
}
.row.active {
  background: rgba(124, 92, 247, 0.08);
}
.row.is-skeleton {
  cursor: default;
}
.skeleton-text {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.row-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 8px;
  background: #f1edfe;
  color: #6440f4;
}
.row-text {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.row-text strong {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-text small {
  color: #8a84a3;
  font-size: 11px;
}
.default-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  padding: 2px 7px;
  border: 1px solid #e6e5ee;
  border-radius: 999px;
  color: #6e6a80;
  font-size: 10.5px;
  font-weight: 600;
}
.note {
  margin: 0;
  padding: 12px 10px;
  color: #6e6a80;
  font-size: 12.5px;
}
.note.is-error {
  color: #e5484d;
}
.note.is-more {
  padding: 8px 10px 4px;
  border-top: 1px solid #f0eff5;
  font-size: 11.5px;
}
</style>
